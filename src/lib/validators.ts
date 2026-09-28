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

const URL_FORMAT_ERROR =
  "* 올바른 URL 형식이 아니에요. 채용공고 페이지 주소를 다시 확인해 주세요.";
const URL_PLATFORM_ERROR =
  "* 아직 지원하지 않는 플랫폼이에요. 지금은 사람인과 잡코리아 공고를 저장할 수 있어요.";

/**
 * 플랫폼 제한 없는 URL 형식 검사. 수동 추가의 원문 링크(선택)에 쓴다.
 *
 * `normalized`는 스킴이 없으면 `https://`를 붙여 돌려준다 — 스킴 없는 값을
 * `<a href>`에 넣으면 상대 경로로 해석되어 링크가 깨지기 때문에 저장 전에 필요하다.
 */
export function validateUrlFormat(input: string): {
  valid: boolean;
  normalized?: string;
  host?: string;
  message?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, message: "" };
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { valid: false, message: URL_FORMAT_ERROR };
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
    return { valid: false, message: URL_FORMAT_ERROR };
  }

  return { valid: true, normalized: url.toString(), host };
}

export function validateJobUrl(input: string): {
  valid: boolean;
  code?: string;
  message?: string;
} {
  const format = validateUrlFormat(input);
  if (!format.valid) {
    return { valid: false, code: "url_format", message: format.message };
  }

  const host = format.host!;
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
    message: URL_PLATFORM_ERROR,
  };
}
