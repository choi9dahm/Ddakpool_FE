"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetImage } from "@/components/ui/AssetImage";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { assets } from "@/lib/assets";
import { CS_EMAIL } from "@/lib/constants";
import { apiFetch } from "@/lib/api-client";
import { captureGuestToken, claimGuest } from "@/lib/guest";
import { createClient } from "@/lib/supabase/client";
import {
  clearGuestFlag,
  enableDevSession,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  emailSchema,
  nicknameSchema,
  signupPasswordSchema,
} from "@/lib/validators";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      fieldErrors.email = "*이메일 형식이 올바르지 않습니다.";
    }

    const passwordResult = signupPasswordSchema.safeParse(password);
    if (!passwordResult.success) {
      fieldErrors.password = "*비밀번호 형식이 올바르지 않습니다.";
    }

    const nicknameResult = nicknameSchema.safeParse(nickname);
    if (!nicknameResult.success) {
      fieldErrors.nickname = "*닉네임 형식이 올바르지 않습니다.";
    }

    if (!agreeTerms || !agreeAge) {
      fieldErrors.terms = "*필수 약관에 동의해 주세요.";
    }

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
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

    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, nickname }),
      });
    } catch (err) {
      setLoading(false);
      const message =
        err instanceof Error ? err.message : "회원가입에 실패했습니다.";
      if (message.includes("이메일")) {
        setErrors({ email: "이미 사용 중인 이메일입니다." });
      } else {
        setErrors({ form: message });
      }
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      router.push("/login");
      return;
    }

    try {
      await claimGuest(guestToken);
    } catch (err) {
      // 가입은 성공했으므로 진입을 막지 않는다.
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
        className="font-pretendard flex w-full max-w-[400px] flex-col gap-4"
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
          마감돼도 괜찮아,{" "}
          <span className="font-semibold">딱풀에 붙여뒀으니까!</span>
        </p>

        {(["email", "password", "nickname"] as const).map((field) => {
          const labels = {
            email: {
              ph: "choigoodahm@gmail.com",
              hint: "이메일 형식으로 입력하세요.",
              type: "email",
            },
            password: {
              ph: "비밀번호를 입력해주세요.",
              hint: "숫자, 영문, 특수문자를 포함하여 6자 이상",
              type: "password",
            },
            nickname: {
              ph: "닉네임을 입력해주세요.",
              hint: "한글, 영문(대/소문자), 숫자 사용 가능, 2~8자 이내",
              type: "text",
            },
          };
          const values = { email, password, nickname };
          const setters = {
            email: setEmail,
            password: setPassword,
            nickname: setNickname,
          };

          return (
            <div key={field}>
              <div className="relative">
                <input
                  type={labels[field].type}
                  placeholder={labels[field].ph}
                  value={values[field]}
                  onChange={(e) => setters[field](e.target.value)}
                  className={`h-[45px] w-full rounded-[12px] px-4 text-sm outline-none ${
                    errors[field]
                      ? "bg-dd-error-bg pr-36"
                      : "bg-dd-gray-100"
                  }`}
                />
                {errors[field] && (
                  <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dd-error">
                    {errors[field]}
                  </p>
                )}
              </div>
              <p className="mt-1 text-xs text-dd-gray-500">{labels[field].hint}</p>
            </div>
          );
        })}

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="size-4 accent-dd-black"
            />
            <span>
              이용약관 동의 (필수){" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-dd-gray-500 underline"
              >
                약관 보기
              </button>
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeAge}
              onChange={(e) => setAgreeAge(e.target.checked)}
              className="size-4 accent-dd-black"
            />
            만 14세 이상입니다 (필수)
          </label>
          {errors.terms && (
            <p className="text-xs text-dd-error">{errors.terms}</p>
          )}
        </div>

        {errors.form && <p className="text-sm text-dd-error">{errors.form}</p>}

        <button
          type="submit"
          disabled={loading}
          className="h-[45px] rounded-[12px] bg-dd-black text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>

        <Link
          href="/login"
          className="flex h-[45px] items-center justify-center rounded-[12px] border border-dd-black bg-white text-sm font-medium text-dd-black"
        >
          로그인
        </Link>

        <p className="text-center text-xs text-dd-gray-500">
          딱풀은 현재 베타 서비스 입니다. 문의·제안은{" "}
          <a href={`mailto:${CS_EMAIL}`} className="underline">
            {CS_EMAIL}
          </a>{" "}
          로 보내주세요.
        </p>
      </form>

      <Modal
        open={showTerms}
        title="이용약관"
        onClose={() => setShowTerms(false)}
        actions={
          <ModalButton variant="outline" onClick={() => setShowTerms(false)}>
            닫기
          </ModalButton>
        }
      >
        <div className="max-h-[320px] overflow-y-auto text-left text-sm leading-relaxed text-dd-gray-500">
          <pre className="whitespace-pre-wrap break-words font-pretendard">
            {LEGAL_DOCUMENTS}
          </pre>
        </div>
      </Modal>
    </>
  );
}
