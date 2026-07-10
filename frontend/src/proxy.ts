/**
 * @file frontend/src/proxy.ts
 * @description 認証状態のチェックおよび、権限のないユーザーへのリダイレクトを制御する。
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from "@/lib/config/auth";

/**
 * リクエストをインターセプトし、セッションの有無を確認します。
 * セッションが存在しない場合はトップページへリダイレクトします。
 * 
 * @param {NextRequest} request - Next.jsのミドルウェア用リクエストオブジェクト
 * @returns {NextResponse} - 次の処理への継続またはリダイレクト先
 */
export function proxy(request: NextRequest) {
  // クッキーからセッション情報を取得
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  // セッションがない、または値が空の場合、ログインページ（/）へリダイレクト
  if (!session?.value) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // セッションがある → 通過
  return NextResponse.next();
}

/**
 * ミドルウェアを適用するルートの定義
 * 以下のパス配下すべてに認証チェックを適用します。
 */
export const config = {
  // /dashboard ,devices ,admin 配下すべてに適用
  matcher: ['/dashboard/:path*', '/devices/:path*', '/admin/:path*'], 
};
