/**
 * @file frontend/src/lib/api/dashboards_server.ts
 * @description サーバーサイド（Server Components）向けのダッシュボードリンク取得処理
 */

import { cookies } from "next/headers";

import { buildUrl } from "@/lib/api/client";
import { type DashboardLink } from "@/lib/api/dashboards";
import { SESSION_COOKIE_NAME } from "@/lib/config/auth";
import { logger } from "@/lib/logger";

/**
 * サーバーサイドのダッシュボードリンク取得結果
 */
export interface DashboardLinksServerResult {
  links: DashboardLink[];
  errorMessage: string | null;
}

/**
 * サーバーサイドでダッシュボードリンク一覧を取得する。
 * @returns 取得したリンク一覧と表示用エラーメッセージ
 */
export async function fetchDashboardLinksForServer(): Promise<DashboardLinksServerResult> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const targetUrl = buildUrl("/dashboards/");

  if (!targetUrl) {
    logger.error("fetchDashboardLinksForServer - URL construction failed");
    return {
      links: [],
      errorMessage: "リンクの取得に失敗しました",
    };
  }

  if (!sessionCookie) {
    logger.warn("fetchDashboardLinksForServer - session cookie not found");
    return {
      links: [],
      errorMessage: "認証情報が見つからないため、リンクを取得できませんでした",
    };
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn(`fetchDashboardLinksForServer - API returned ${response.status}`);
      return {
        links: [],
        errorMessage: "リンクの取得に失敗しました",
      };
    }

    const links = (await response.json()) as DashboardLink[];
    return {
      links,
      errorMessage: null,
    };
  } catch (error) {
    logger.error(`fetchDashboardLinksForServer - request failed: ${error}`);
    return {
      links: [],
      errorMessage: "リンクの取得に失敗しました",
    };
  }
}