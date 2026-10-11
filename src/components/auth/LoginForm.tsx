"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetImage } from "@/components/ui/AssetImage";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { assets } from "@/lib/assets";
import { CS_EMAIL } from "@/lib/constants";
import { captureGuestToken, claimGuest, enterGuestMode } from "@/lib/guest";
import { createClient } from "@/lib/supabase/client";
import {
  clearGuestFlag,
  enableDevSession,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { emailSchema, loginPasswordSchema } from "@/lib/validators";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH !== "false";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [guestPopupOpen, setGuestPopupOpen] = useState(false);
  const [guestError, setGuestError] = useState(false);

  async function handleContinueAsGuest() {
    setGuestPopupOpen(false);
    setLoading(true);
    try {
      await enterGuestMode();
    } catch {
      setLoading(false);
      setGuestError(true);
      return;
    }
    router.push("/all");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (DEV_SKIP_AUTH) {
      clearGuestFlag();
      enableDevSession();
      router.push("/all");
      router.refresh();
      return;
    }

    const fieldErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      fieldErrors.email = emailResult.error.issues[0]?.message ?? "";
    }

    const passwordResult = loginPasswordSchema.safeParse(password);
    if (!passwordResult.success) {
      fieldErrors.password = passwordResult.error.issues[0]?.message ?? "";
    }

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      if (fieldErrors.email) setEmail("");
      if (fieldErrors.password) setPassword("");
      return;
    }

    setLoading(true);
    setErrors({});

    if (!isSupabaseConfigured()) {
      setLoading(false);
      clearGuestFlag();
      enableDevSession();
      router.push("/all");
      router.refresh();
      return;
    }

    // 세션이 교체되기 전에 게스트 토큰을 확보해야 한다.
    const guestToken = await captureGuestToken();

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setErrors({
        form: "아이디 또는 비밀번호가 올바르지 않습니다.",
      });
      return;
    }

    try {
      await claimGuest(guestToken);
    } catch (err) {
      // 로그인은 성공했으므로 진입을 막지 않는다.
      console.error("guest claim failed:", err);
    }

    setLoading(false);
    router.push("/all");
    router.refresh();
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="font-pretendard flex w-full max-w-[400px] flex-col gap-5"
      >
        <div className="absolute right-12 top-12">
          <AssetImage
            src={assets.logoAuth}
            alt="딱풀"
            width={71}
            height={71}
            placeholderClassName="rounded bg-dd-gray-200"
          />
        </div>

        <p className="text-[36px] font-light leading-snug text-dd-black">
          딱 붙여두고, 딱 맞게 꺼내 쓰는{" "}
          <span className="font-semibold">딱풀!</span>
        </p>
        <p className="-mt-3 text-lg text-dd-black">
          지금, 붙여두는 것부터 시작하세요!
        </p>

        <div>
          <input
            type="email"
            placeholder="choigoodahm@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[45px] w-full rounded-[12px] bg-dd-gray-100 px-4 text-sm outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-dd-error">{errors.email}</p>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="비밀번호를 입력하세요."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-[45px] w-full rounded-[12px] bg-dd-gray-100 px-4 text-sm outline-none"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-dd-error">{errors.password}</p>
          )}
        </div>

        {errors.form && <p className="text-sm text-dd-error">{errors.form}</p>}

        <button
          type="submit"
          disabled={loading}
          className="h-[45px] rounded-[12px] bg-dd-black text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <Link
          href="/signup"
          className="flex h-[45px] items-center justify-center rounded-[12px] border border-dd-black bg-white text-sm font-medium text-dd-black"
        >
          회원가입
        </Link>

        <button
          type="button"
          onClick={() => setGuestPopupOpen(true)}
          disabled={loading}
          className="text-center text-xs text-dd-gray-500 underline disabled:opacity-50"
        >
          로그인 없이 계속
        </button>

        <p className="text-center text-xs text-dd-gray-500">
          딱풀은 현재 베타 서비스 입니다.
          <br />
          문의·제안은{" "}
          <a href={`mailto:${CS_EMAIL}`} className="underline">
            {CS_EMAIL}
          </a>{" "}
          로 보내주세요.
        </p>
      </form>

      <Modal
        open={guestPopupOpen}
        title="안내"
        onClose={() => setGuestPopupOpen(false)}
        width={520}
        actions={
          <>
            <ModalButton
              variant="primary"
              wide
              onClick={() => setGuestPopupOpen(false)}
            >
              로그인 하기
            </ModalButton>
            <ModalButton variant="outline" wide onClick={handleContinueAsGuest}>
              로그인 없이 계속
            </ModalButton>
          </>
        }
      >
        <p>스크랩한 공고를 다음에도 보고싶다면 꼭 로그인 후 사용해주세요.</p>
      </Modal>

      <Modal
        open={guestError}
        title="안내"
        onClose={() => setGuestError(false)}
        actions={
          <ModalButton variant="outline" onClick={() => setGuestError(false)}>
            닫기
          </ModalButton>
        }
      >
        <p>지금은 로그인 없이 진입할 수 없어요. 잠시 후 다시 시도해 주세요.</p>
      </Modal>
    </>
  );
}
