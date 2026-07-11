/**
 * @file frontend/src/lib/api/init_admin_server.ts
 * @description サーバーサイド（Server Components, Server Actions）向けの初期管理者関連API操作
 * 
 * 注意: このファイル内の関数は、Next.jsのサーバー環境でのみ動作するように設計されています。
 * クライアントコンポーネントからは呼び出さないでください。
 */

import { buildUrl } from "./client";
import { logger } from "@/lib/logger";

/**
 * 初期設定が必要かどうかを判定するサーバー用関数
 * @description バックエンドの初期管理者セットアップ状況を確認します。
 * 
 * @returns 設定が必要な場合は true、不要な場合は false を返す
 */
export async function checkInitialSetupRequired(): Promise<boolean> {
  const targetUrl = buildUrl("/auth/init-admin/status");

  if (!targetUrl) {
    logger.error(`checkInitialSetupRequired - 初期セットアップ判定URLの構築に失敗しました。`);
    return false;
  }

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store", // 動的な状態を確認するためキャッシュを無効化
    });

    // 204 No Content または 404 Not Found を判定
    // バックエンド仕様: 204ならセットアップが必要、それ以外（通常は404）は不要と判断。
    if (response.status === 204) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`checkInitialSetupRequired - 初期セットアップ判定の取得に失敗しました: ${error}`);
    return false;
  }
}