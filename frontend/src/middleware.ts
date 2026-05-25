// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('simpleauth_session');

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
