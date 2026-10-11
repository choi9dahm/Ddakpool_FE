import { apiFetch } from "./api-client";
import { createClient } from "./supabase/client";
import {
  clearGuestFlag,
  enableDevSession,
  enableGuestFlag,
  hasGuestFlag,
  isSupabaseConfigured,
} from "./supabase/config";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH !== "false";

export async function enterGuestMode(): Promise<void> {
  enableGuestFlag();

  if (DEV_SKIP_AUTH || !isSupabaseConfigured()) {
    enableDevSession();
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    clearGuestFlag();
    throw error;
  }

  await apiFetch("/auth/guest", { method: "POST" });
}

export async function captureGuestToken(): Promise<string | null> {
  if (!hasGuestFlag() || !isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function claimGuest(guestToken: string | null): Promise<void> {
  clearGuestFlag();
  if (!guestToken) return;
  await apiFetch("/auth/claim-guest", {
    method: "POST",
    body: JSON.stringify({ guest_token: guestToken }),
  });
}
