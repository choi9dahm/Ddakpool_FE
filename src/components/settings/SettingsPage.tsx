"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { assets } from "@/lib/assets";
import { CS_EMAIL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  clearDevSession,
  clearGuestFlag,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { nicknameSchema } from "@/lib/validators";
import type { Profile } from "@/lib/types";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { HeaderArea } from "@/components/layout/HeaderArea";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<Profile>("/profile"),
  });

  useEffect(() => {
    if (profile?.nickname) setNickname(profile.nickname);
  }, [profile?.nickname]);

  async function handleSaveNickname() {
    const result = nicknameSchema.safeParse(nickname);
    if (!result.success) {
      setError(
        result.error.issues[0]?.message ?? "*닉네임 형식이 올바르지 않습니다"
      );
      return;
    }

    setError("");
    try {
      await apiFetch("/profile", {
        method: "PATCH",
        body: JSON.stringify({ nickname }),
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setToastOpen(true);
    } catch {
      setSaveError(true);
    }
  }

  async function handleLogout() {
    if (posthog.__loaded) posthog.reset();
    clearGuestFlag();

    if (!isSupabaseConfigured()) {
      clearDevSession();
      router.push("/login");
      router.refresh();
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleWithdraw() {
    await apiFetch("/account", { method: "DELETE" });

    if (posthog.__loaded) posthog.reset();
    clearGuestFlag();

    if (!isSupabaseConfigured()) {
      clearDevSession();
      router.push("/login");
      router.refresh();
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-dd-gray-100">
      <HeaderArea compact />

      {/* 뒤로가기 바 — Figma 758:26835 */}
      <div className="flex h-[51px] shrink-0 items-center bg-dd-gray-100 px-8">
        <button
          type="button"
          onClick={() => router.push("/all")}
          className="font-pretendard flex items-center gap-2 text-sm font-medium text-dd-black"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assets.iconBack} alt="" width={16} height={16} />
          뒤로가기
        </button>
      </div>

      {/* 본문 2컬럼 — Figma 758:26252 */}
      <div className="flex flex-1 items-start justify-between gap-10 overflow-y-auto px-20 py-8">
        {/* 좌측: 닉네임/이메일/로그아웃 */}
        <div className="flex w-full max-w-[463px] flex-col gap-[15px] px-[47px] py-1">
          <div className="flex w-full max-w-[384px] flex-col gap-[9px]">
            <div className="flex h-[19px] items-center justify-between pr-3.5">
              <label className="font-pretendard text-base font-semibold text-dd-black">
                닉네임
              </label>
              {error && (
                <p className="font-pretendard text-[10px] font-medium text-dd-error">
                  {error.startsWith("*") ? error : `*${error}`}
                </p>
              )}
            </div>
            <div className="flex h-[47px] items-center justify-between rounded-full bg-white py-2 pl-[13px] pr-2">
              <input
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError("");
                }}
                className="font-pretendard min-w-0 flex-1 bg-transparent text-xs text-dd-black outline-none"
              />
              <button
                type="button"
                onClick={handleSaveNickname}
                className="font-pretendard flex h-[31px] w-[69px] shrink-0 items-center justify-center rounded-full bg-dd-primary-green text-sm font-semibold text-white"
              >
                저장
              </button>
            </div>
            <p className="font-pretendard text-[10px] font-semibold text-dd-gray-500">
              한글, 영문(대/소문자), 숫자 사용 가능, 2-8자 이내
            </p>
          </div>

          <div className="flex w-full max-w-[384px] flex-col gap-[9px]">
            <label className="font-pretendard text-base font-semibold text-dd-black">
              이메일
            </label>
            <div className="flex h-[47px] items-center rounded-full bg-white px-[13px] py-2">
              <p className="font-pretendard text-xs text-dd-black">
                {profile?.email}
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-[384px] justify-center pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="font-pretendard flex h-[43px] w-[108px] items-center justify-center rounded-full bg-dd-primary-green text-base font-semibold text-white"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 우측: 서비스 소개 */}
        <div className="flex w-full max-w-[451px] flex-col gap-2.5 pt-2">
          <div className="flex w-full max-w-[428px] flex-col gap-[15px]">
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="shrink-0 cursor-pointer"
                title="온보딩 미리보기 (테스트)"
                aria-label="온보딩 미리보기"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assets.iconDdakpoolMark}
                  alt="딱풀"
                  width={31}
                  height={20}
                  className="shrink-0"
                />
              </button>
              <span className="font-alata px-2.5 text-[10px] leading-none tracking-[-0.1px] text-dd-black">
                ddakpool
              </span>
              <span className="font-pretendard text-[8px] leading-none tracking-[-0.088px] text-dd-gray-500">
                ddakpool.v2.0
              </span>
            </div>
            <p className="font-pretendard text-[10px] leading-[1.5] tracking-[-0.11px] text-dd-black">
              흩어진 공고를 한곳에 딱. 종이 스크랩에 딱풀을 쓰듯, 여러 플랫폼에
              널린 공고를 한곳에 붙여 모으는 딱풀
              <br />한 번 붙은 공고는 떨어지지 않아요. 왜 붙여뒀는지도 함께
              기록해요.
              <br />
              지원을 결정할 때. 포트폴리오 방향을 잡을 때. 자기소개서 키워드를
              뽑을 때
              <br />
              <span className="font-bold">
                필요한 순간, 저장해둔 공고를 바로 다시 꺼낼 수 있도록
              </span>
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-[22px] pl-3">
            <button
              type="button"
              onClick={() => setShowWithdraw(true)}
              className="font-pretendard w-fit text-[10px] font-semibold tracking-[-0.11px] text-dd-black underline"
            >
              회원 탈퇴
            </button>
            <p className="font-pretendard text-[10px] font-semibold text-dd-gray-500">
              딱풀은 현재 베타 서비스 입니다. 문의·제안은{" "}
              <a
                href={`mailto:${CS_EMAIL}`}
                className="underline hover:text-dd-black"
              >
                {CS_EMAIL}
              </a>{" "}
              로 보내주세요.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={saveError}
        title="안내"
        onClose={() => setSaveError(false)}
        variant="error"
        actions={
          <ModalButton variant="outline" onClick={() => setSaveError(false)}>
            닫기
          </ModalButton>
        }
      >
        <p>
          수정한 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </Modal>

      <Modal
        open={showWithdraw}
        title="안내"
        onClose={() => setShowWithdraw(false)}
        variant="confirm-withdraw"
        actions={
          <>
            <ModalButton variant="danger" onClick={handleWithdraw}>
              탈퇴하기
            </ModalButton>
            <ModalButton
              variant="outline"
              onClick={() => setShowWithdraw(false)}
            >
              취소
            </ModalButton>
          </>
        }
      >
        <p>
          정말 탈퇴하시겠어요? 탈퇴하면 모든 공고와 데이터가 삭제되며 복구할 수
          없어요.
        </p>
      </Modal>

      <OnboardingModal
        open={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }}
      />

      <Toast
        message="저장이 완료되었어요!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
