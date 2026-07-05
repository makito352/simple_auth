/**
 * @file users_server.ts
 * @description サーバーサイド（Server Components, Server Actions）向けのユーザー関連API操作
 * 
 * 注意: このファイル内の関数は、Next.jsのサーバー環境でのみ動作するように設計されています。
 * クライアントコンポーネントからは呼び出さないでください。
 */

import { cookies } from "next/headers";
import { isAdmin, type UserProfile } from "@/lib/api/users";
import { logger } from "@/lib/logger";
import { buildUrl } from "@/lib/api/client";

/**
 * サーバーサイドで実行されるユーザープロフィール取得関数
 * @description cookieからセッションを取得し、バックエンドAPIから現在のユーザー情報を取得します。
 * @returns プロフィール情報のオブジェクトまたはnull
 */
export async function fetchUserProfileForServer(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("simpleauth_session")?.value;
  const targetUrl = buildUrl("/users/me");

  if (!targetUrl) { // buildUrl内のロジックに合わせるため、または単純な存在チェックとして
    logger.error(`fetchUserProfileForServer - URL construction failed.`);
    return null;
  }
  if (!sessionCookie) {
    logger.warn("fetchUserProfileForServer - session cookie not found");
    return null;
  }
  logger.debug(`fetchUserProfileForServer - Attempting to fetch from URL: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Cookie: `simpleauth_session=${sessionCookie}`,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn(`fetchUserProfileForServer - API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    logger.debug(`fetchUserProfileForServer - Raw response body: ${JSON.stringify(data)}`);

    const user = data as UserProfile;
    logger.debug(`fetchUserProfileForServer - loaded user: ${JSON.stringify(user)}`);
    return user;
  } catch (error) {
    logger.error(`fetchUserProfileForServer - failed: ${error}`);
    return null;
  }
}
