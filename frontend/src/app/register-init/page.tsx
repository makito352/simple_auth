/**
 * @file frontend/src/app/register-init/page.tsx
 * @description 初期管理者デバイス登録ページのサーバーエントリ。
 *
 * 初期セットアップが不要な状態では、ページを404として扱います。
 */

import { notFound } from "next/navigation";
import RegisterInitContent from "./RegisterInitClient";
import { checkInitialSetupRequired } from "@/lib/api/init_admin_server";
import { logger } from "@/lib/logger";

/**
 * 初期管理者デバイス登録ページ。
 * 初期セットアップが不要な場合は 404 を返却します。
 */
export default async function RegisterInitPage() {
  // 初期セットアップが必要かどうかをサーバーサイドで判定
  const isInitialSetupRequired = await checkInitialSetupRequired();

  // 初期セットアップが不要な場合は、404 Not Found を返却
  if (!isInitialSetupRequired) {
    logger.debug("RegisterInitPage - 初期セットアップが不要な状態でアクセスされました。404を返却します。");
    notFound();
  }

  // 初期セットアップが必要な場合は、クライアントコンポーネントをレンダリング
  logger.debug("RegisterInitPage - 初期セットアップが必要な状態でアクセスされました。クライアントコンポーネントをレンダリングします。");
  return <RegisterInitContent />;
}