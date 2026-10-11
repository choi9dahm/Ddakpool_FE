"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssetImage } from "@/components/ui/AssetImage";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { assets } from "@/lib/assets";
import { mapOtpVerifyError, mapResendAuthError, mapSignupAuthError } from "@/lib/authErrors";
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

const OTP_COOLDOWN_SECONDS = 30;

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  // verifyOtp 성공 시 세션이 게스트→영구 계정으로 바뀌므로, complete-signup
  // 재시도 시에도 쓸 수 있게 처음 확보한 게스트 토큰을 들고 있는다.
  const pendingGuestTokenRef = useRef<string | null>(null);

  // 재발송/최초 발송 때마다 otpSentAt이 바뀌며 30초 카운트다운을 새로 시작한다.
  useEffect(() => {
    if (!otpSentAt) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSentAt]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "otp") return; // 인증번호는 자동 검증, 수동 제출 없음
    await handleRequestOtp();
  }

  async function handleRequestOtp() {
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

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    });

    setLoading(false);

    if (error) {
      setErrors({ form: mapSignupAuthError(error) });
      return;
    }

    // Confirm email이 켜져 있으면, 이미 가입 확정된 이메일에는 열거형 공격 방지용
    // 가짜 유저(identities: [])가 에러 없이 돌아온다. 미확정 계정 재가입은 identities가
    // 채워진 채로 돌아오고 Supabase가 새 OTP를 자동 재발급한다(별도 처리 불필요).
    if (data.user && data.user.identities?.length === 0) {
      setErrors({ email: "이미 사용 중인 이메일입니다." });
      return;
    }

    setStep("otp");
    setOtp("");
    setVerified(false);
    setCompleteError(null);
    setOtpSentAt(Date.now());
    setCooldown(OTP_COOLDOWN_SECONDS);
  }

  function handleOtpChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setOtp(digits);
    setErrors((prev) => ({ ...prev, otp: undefined }));

    if (digits.length === 6) {
      if (!agreeTerms || !agreeAge) {
        setErrors((prev) => ({ ...prev, terms: "*필수 약관에 동의해 주세요." }));
        return;
      }
      void handleVerifyOtp(digits);
    }
  }

  // 인증번호를 다 입력한 뒤에 약관을 체크하는 경우, 그 시점에 검증을 이어서 실행한다.
  function maybeVerifyAfterTermsChange(nextAgreeTerms: boolean, nextAgreeAge: boolean) {
    if (step === "otp" && otp.length === 6 && !verified && nextAgreeTerms && nextAgreeAge) {
      setErrors((prev) => ({ ...prev, terms: undefined }));
      void handleVerifyOtp(otp);
    }
  }

  async function handleVerifyOtp(token: string) {
    if (verifying || completing) return;
    setVerifying(true);
    setErrors((prev) => ({ ...prev, otp: undefined }));

    // verifyOtp가 성공하면 세션이 게스트→영구 계정으로 바로 교체되므로,
    // 그 전에 게스트 세션의 토큰을 확보해 둬야 한다.
    const guestToken = await captureGuestToken();

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

    if (error) {
      setVerifying(false);
      setErrors((prev) => ({ ...prev, otp: mapOtpVerifyError(error, otpSentAt) }));
      setOtp("");
      return;
    }

    setVerified(true);
    setTimeout(() => {
      void finishSignup(guestToken);
    }, 300);
  }

  async function finishSignup(guestToken: string | null) {
    setVerifying(false);
    setCompleting(true);
    setCompleteError(null);
    pendingGuestTokenRef.current = guestToken;

    try {
      await apiFetch("/auth/complete-signup", {
        method: "POST",
        body: JSON.stringify({ nickname }),
      });
    } catch {
      setCompleting(false);
      setCompleteError("가입 완료 처리에 실패했어요. 다시 시도해주세요.");
      return;
    }

    try {
      await claimGuest(guestToken);
    } catch (err) {
      // 가입은 성공했으므로 진입을 막지 않는다.
      console.error("guest claim failed:", err);
    }

    router.push("/all");
    router.refresh();
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setErrors((prev) => ({ ...prev, otp: undefined }));

    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      setErrors((prev) => ({ ...prev, otp: mapResendAuthError(error) }));
      return;
    }

    setOtp("");
    setVerified(false);
    setOtpSentAt(Date.now());
    setCooldown(OTP_COOLDOWN_SECONDS);
  }

  return (
    <>
      <form
        onSubmit={handleFormSubmit}
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
                  disabled={step === "otp"}
                  className={`h-[45px] w-full rounded-[12px] px-4 text-sm outline-none disabled:opacity-50 ${
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

        {step === "otp" && (
          <div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="인증번호 6자리"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                disabled={verifying || completing}
                className={`h-[45px] w-full rounded-[12px] px-4 text-sm outline-none disabled:opacity-50 ${
                  errors.otp
                    ? "bg-dd-error-bg pr-36"
                    : verified
                      ? "border border-dd-green bg-white"
                      : "bg-dd-gray-100"
                }`}
              />
              {errors.otp && (
                <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dd-error">
                  {errors.otp}
                </p>
              )}
              {verified && !errors.otp && (
                <AssetImage
                  src={assets.iconCheck}
                  alt=""
                  width={20}
                  height={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  placeholderClassName="bg-transparent"
                />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-dd-gray-500">
                {verified ? "인증이 완료됐어요." : "메일로 받은 인증번호를 입력해주세요."}
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || verifying || completing}
                className="text-xs text-dd-gray-500 underline disabled:opacity-50"
              >
                {cooldown > 0 ? `재전송 (${cooldown}초)` : "인증번호 재전송"}
              </button>
            </div>
          </div>
        )}

        {completeError && (
          <div className="flex items-center justify-between rounded-[12px] bg-dd-error-bg px-4 py-3 text-xs text-dd-error">
            <span>{completeError}</span>
            <button
              type="button"
              onClick={() => void finishSignup(pendingGuestTokenRef.current)}
              className="underline"
            >
              다시 시도
            </button>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                maybeVerifyAfterTermsChange(e.target.checked, agreeAge);
              }}
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
              onChange={(e) => {
                setAgreeAge(e.target.checked);
                maybeVerifyAfterTermsChange(agreeTerms, e.target.checked);
              }}
              className="size-4 accent-dd-black"
            />
            만 14세 이상입니다 (필수)
          </label>
          {errors.terms && (
            <p className="text-xs text-dd-error">{errors.terms}</p>
          )}
        </div>

        {errors.form && <p className="text-sm text-dd-error">{errors.form}</p>}

        {step === "form" && (
          <button
            type="submit"
            disabled={loading}
            className="h-[45px] rounded-[12px] bg-dd-black text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "인증 요청 중..." : "인증하기"}
          </button>
        )}

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
