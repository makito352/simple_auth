// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from "@/lib/config/auth";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  // セッションが無い → トップページへリダイレクト
  if (!session?.value) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // セッションがある → 通過
  return NextResponse.next();
}

// どのパスに middleware を適用するか
export const config = {
  matcher: ['/dashboard/:path*'], // /dashboard 配下すべてに適用
};
