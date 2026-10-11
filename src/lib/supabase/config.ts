export const DEV_AUTH_COOKIE = "ddakpool-dev-auth";
export const DEV_AUTH_TOKEN = "dev-local-token";
// 게스트 모드 UI/라우팅 플래그. 실제 인증은 Supabase 익명 세션이 담당한다.
export const GUEST_COOKIE = "ddakpool-guest";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export function enableDevSession(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${DEV_AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }
}

export function clearDevSession(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${DEV_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function hasDevSession(): boolean {
  return hasFlagCookie(DEV_AUTH_COOKIE);
}

export function enableGuestFlag(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${GUEST_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }
}

export function clearGuestFlag(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${GUEST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function hasGuestFlag(): boolean {
  return hasFlagCookie(GUEST_COOKIE);
}

function hasFlagCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim() === `${name}=1`);
}
