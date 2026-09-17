import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 매 요청마다 Supabase 세션을 갱신한다.
 * Next.js 16 의 Proxy(구 Middleware, src/proxy.ts)에서 호출된다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase 환경변수가 아직 설정되지 않았으면 세션 갱신을 건너뛴다.
  // (.env.local 설정 전에도 앱이 뜨도록)
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() 를 호출해야 만료된 세션이 갱신된다. 이 줄을 지우면 로그인 상태가 임의로 풀릴 수 있다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const protectedPaths = ["/dashboard", "/portfolio", "/feed"];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  // 비로그인 사용자가 보호된 경로 접근 → 로그인으로
  if (!user && isProtected) {
    return redirectKeepingCookies(request, supabaseResponse, "/login");
  }
  // 로그인 사용자가 로그인 페이지 접근 → 포트폴리오로
  if (user && path === "/login") {
    return redirectKeepingCookies(request, supabaseResponse, "/portfolio");
  }

  return supabaseResponse;
}

/**
 * 리다이렉트하면서 갱신된 인증 쿠키를 함께 실어 보낸다.
 * (supabaseResponse 의 쿠키를 복사하지 않으면 세션이 어긋날 수 있음)
 */
function redirectKeepingCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  const response = NextResponse.redirect(redirectUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}
