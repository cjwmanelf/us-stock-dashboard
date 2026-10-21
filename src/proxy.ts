import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 부터 Middleware 는 Proxy 로 이름이 바뀌었다. (기능은 동일, Node.js 런타임)
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/game/")) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에서 실행:
     * - _next/static, _next/image (정적 파일)
     * - favicon.ico, 이미지 파일들
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
