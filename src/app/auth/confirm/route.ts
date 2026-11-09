import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authRedirectOrigin, safeAuthNext } from "@/lib/supabase/redirects";

/**
 * 회원가입 확인 이메일 링크의 착지점.
 * Supabase 가 보낸 token_hash 를 검증(verifyOtp)해 세션을 만든 뒤 next 로 이동.
 */
export async function GET(request: NextRequest) {
  const origin = authRedirectOrigin(request);
  if (!origin) return NextResponse.json({ error: "AUTH_REDIRECT_NOT_CONFIGURED" }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeAuthNext(searchParams.get("next"), origin);

  if (token_hash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch { /* Network/auth failure uses the same canonical error redirect. */ }
  }

  return NextResponse.redirect(new URL("/login?error=confirm", origin));
}
