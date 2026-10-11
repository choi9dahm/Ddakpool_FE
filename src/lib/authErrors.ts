// Supabase가 틀린 코드와 만료된 코드를 둘 다 `otp_expired`로 돌려주므로,
// 발송 시각(otpSentAt) 기준 10분 경과 여부로 문구를 가른다.
// 10분은 Supabase 대시보드의 Email OTP Expiration 설정과 맞춰야 한다.
const OTP_TTL_MS = 10 * 60 * 1000;

type AuthErrorLike =
  | { code?: string | null; message?: string; status?: number }
  | null
  | undefined;

// auth-js는 5xx 응답일 때 파싱한 본문이 아니라 Response 객체를 JSON.stringify 해서
// 에러 메시지로 쓴다(lib/fetch.js handleError). Response는 own enumerable 프로퍼티가
// 없어 결과가 항상 "{}"다. 그 쓰레기 문자열을 사용자에게 그대로 노출하면 안 된다.
function isUselessMessage(message: string | undefined): boolean {
  if (!message) return true;
  const trimmed = message.trim();
  return trimmed === "" || trimmed === "{}" || trimmed === "[object Object]";
}

function fallbackMessage(error: AuthErrorLike, generic: string): string {
  // 5xx는 거의 항상 메일 발송 실패(SMTP 설정 오류)다. 원인은 Supabase Auth Logs에 남는다.
  if (error?.status && error.status >= 500) {
    return "인증 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.";
  }
  return isUselessMessage(error?.message) ? generic : error!.message!;
}

export function mapSignupAuthError(error: AuthErrorLike): string {
  switch (error?.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "잠시 후 다시 시도해주세요.";
    case "email_address_invalid":
    case "validation_failed":
      return "이메일 형식을 확인해주세요.";
    case "weak_password":
      return "비밀번호 형식이 올바르지 않습니다.";
    case "signup_disabled":
      return "현재 회원가입이 일시 중단되었어요.";
    default:
      return fallbackMessage(error, "회원가입에 실패했습니다.");
  }
}

export function mapOtpVerifyError(error: AuthErrorLike, otpSentAt: number | null): string {
  if (error?.code === "over_email_send_rate_limit") {
    return "잠시 후 다시 시도해주세요.";
  }
  if (error?.status && error.status >= 500) {
    return "인증에 실패했어요. 잠시 후 다시 시도해주세요.";
  }
  if (error?.code === "otp_expired") {
    const expired = otpSentAt !== null && Date.now() - otpSentAt > OTP_TTL_MS;
    return expired
      ? "인증 코드가 만료되었어요. 다시 요청해 주세요."
      : "인증 번호가 올바르지 않아요.";
  }
  return "인증 번호가 올바르지 않아요.";
}

export function mapResendAuthError(error: AuthErrorLike): string {
  if (error?.code === "over_email_send_rate_limit") {
    return "잠시 후 다시 시도해주세요.";
  }
  return fallbackMessage(error, "인증 코드를 다시 보내지 못했어요.");
}
