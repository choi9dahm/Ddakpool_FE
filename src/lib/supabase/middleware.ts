import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_COOKIE, GUEST_COOKIE, isSupabaseConfigured } from "./config";

export async function updateSession(request: NextRequest) {
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  // 게스트는 로그인 화면으로 돌아갈 수 있어야 한다(요구사항 4).
  const isGuestFlagged = request.cookies.get(GUEST_COOKIE)?.value === "1";

  if (!isSupabaseConfigured()) {
    const devSession = request.cookies.get(DEV_AUTH_COOKIE)?.value === "1";

    if (!devSession && !isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (devSession && isAuthPage && !isGuestFlagged) {
      const url = request.nextUrl.clone();
      url.pathname = "/all";
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !user.is_anonymous && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/all";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
