import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "아이디를 입력해주세요.")
  .email("이메일 형식을 확인해주세요.");

export const loginPasswordSchema = z
  .string()
  .min(1, "비밀번호를 입력해주세요.")
  .min(6, "비밀번호는 6자 이상 입력해주세요.");

export const signupPasswordSchema = z
  .string()
  .min(1, "*비밀번호를 입력해주세요.")
  .min(6, "*비밀번호 형식이 올바르지 않습니다.")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    "*비밀번호 형식이 올바르지 않습니다."
  );

export const nicknameSchema = z
  .string()
  .min(1, "*닉네임을 입력해주세요.")
  .min(2, "*닉네임 형식이 올바르지 않습니다.")
  .max(8, "*닉네임 형식이 올바르지 않습니다.")
  .regex(/^[가-힣a-zA-Z0-9]+$/, "*닉네임 형식이 올바르지 않습니다.");

export function validateJobUrl(input: string): {
  valid: boolean;
  code?: string;
  message?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, code: "url_format", message: "" };
  }

  const FORMAT_ERROR =
    "* 올바른 URL 형식이 아니에요. 채용공고 페이지 주소를 다시 확인해 주세요.";
  const PLATFORM_ERROR =
    "* 아직 지원하지 않는 플랫폼이에요. 지금은 사람인과 잡코리아 공고를 저장할 수 있어요.";

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { valid: false, code: "url_format", message: FORMAT_ERROR };
  }

  // 한글·임의 문자열에 https://만 붙으면 URL 파서가 통과하므로,
  // 호스트에 도메인(.)이 있고 라벨이 비어 있지 않은지 추가로 검사한다.
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (
    !host ||
    !host.includes(".") ||
    host.startsWith(".") ||
    host.endsWith(".") ||
    host.split(".").some((part) => !part)
  ) {
    return { valid: false, code: "url_format", message: FORMAT_ERROR };
  }

  const isSaramin =
    host === "saram.in" ||
    host.endsWith(".saram.in") ||
    host.includes("saramin.co.kr");
  const isJobkorea =
    host === "joburl.kr" ||
    host.endsWith(".joburl.kr") ||
    host.includes("jobkorea.co.kr");

  if (isSaramin || isJobkorea) {
    return { valid: true };
  }

  return {
    valid: false,
    code: "unsupported_platform",
    message: PLATFORM_ERROR,
  };
}
