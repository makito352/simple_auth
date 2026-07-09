/**
 * @file users_server.ts
 * @description サーバーサイド（Server Components, Server Actions）向けのユーザー関連API操作
 * 
 * 注意: このファイル内の関数は、Next.jsのサーバー環境でのみ動作するように設計されています。
 * クライアントコンポーネントからは呼び出さないでください。
 */

import { cookies } from "next/headers";
import { type UserProfile } from "@/types";
import { logger } from "@/lib/logger";
import { buildUrl } from "@/lib/api/client";
import { SESSION_COOKIE_NAME } from "@/lib/config/auth";

/**
 * サーバーサイドで実行されるユーザープロフィール取得関数
 * @description cookieからセッションを取得し、バックエンドAPIから現在のユーザー情報を取得します。
 * @returns プロフィール情報のオブジェクトまたはnull（セッションがない場合やエラー時にnullを返す）
 */
export async function fetchUserProfileForServer(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  // セッション識別用のCookieを取得
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const targetUrl = buildUrl("/users/me");

  // URL構築に失敗した場合はエラーを記録して中断
  if (!targetUrl) {
    logger.error(`fetchUserProfileForServer - URL construction failed.`);
    return null;
  }

  // セッションクッキーが存在しない場合は認証されていないと判断
  if (!sessionCookie) {
    logger.warn("fetchUserProfileForServer - session cookie not found");
    return null;
  }

  logger.debug(`fetchUserProfileForServer - Attempting to fetch from URL: ${targetUrl}`);

  try {
    // バックエンドへのリクエストを実行
    const response = await fetch(targetUrl, {
      headers: {
        // サーバーサイドからのリクエストのため、Cookieヘッダーを明示的に含める
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
      },
      credentials: "include",
      cache: "no-store", // 動的なユーザー情報を取得するためキャッシュを無効化
    });

    // レスポンスが正常（200系）でない場合はエラーとして処理
    if (!response.ok) {
      logger.warn(`fetchUserProfileForServer - API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as UserProfile;
    logger.debug(`fetchUserProfileForServer - loaded user: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    // 通信エラーやパースエラーをキャッチ
    logger.error(`fetchUserProfileForServer - failed: ${error}`);
    return null;
  }
}

