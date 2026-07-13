/**
 * @file 管理者向け管理画面の共通レイアウトコンポーネント
 * 管理権限の検証、サイドバーナビゲーション、メインコンテンツエリアの構成を提供します。
 */
import { redirect } from "next/navigation";

import Sidebar from "@/components/features/admin/Sidebar";
import { isAdmin } from "@/lib/api/users";
import { fetchUserProfileForServer } from "@/lib/api/users_server";
import { logger } from "@/lib/logger";

/**
 * 管理者権限チェック用の関数
 * サーバーサイドで実行され、ユーザーが存在するか、および管理者権限を持っているかを確認します。
 * 権限がない場合は適切なページにリダイレクトします。
 * @returns {Promise<void>} - 検証成功時は何も返さず続行。失敗した場合は redirect を実行。
 */
async function validateAdmin() {
  // サーバーサイドからユーザー情報を取得
  const user = await fetchUserProfileForServer();
  logger.debug(`validateAdmin - Fetching user profile. Result: ${user ? "Success" : "Failed"}`);

  // ユーザー情報が存在するか確認。未ログインまたはプロファイル取得失敗時はトップページへリダイレクト
  if (!user) {
    logger.warn("validateAdmin - User not found. Redirecting to /.");
    redirect("/");
  }

  // 取得したユーザーデータに基づき、管理者権限（isAdmin）の有無を判定
  const isAllowed = isAdmin(user);

  // 管理者権限がない場合、ダッシュボードへリダイレクト
  if (!isAllowed) {
    logger.warn(`validateAdmin - Access denied for user: ${JSON.stringify(user)}. Redirecting to /dashboard.`);
    redirect("/dashboard");
  }

  // すべてのチェックを通過したことを記録
  logger.debug("validateAdmin - Success. User is authorized.");
}

/**
 * 管理者用セクションの共通レイアウト
 * このコンポーネントはすべての管理系ページ（/admin/links, /admin/settings等）に適用されます。
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {React.ReactNode} props.children - 表示するメインコンテンツ
 * @returns {JSX.Element} 管理者用レイアウトをレンダリングした要素
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 権限チェックを実行。不正なユーザーはここでリダイレクトされる。
  await validateAdmin();

  return (
    <div className="flex min-h-screen bg-white">
      {/* サイドバーを独立したコンポーネントとして呼び出す */}
      <Sidebar />

      {/* メインコンテンツ領域 */}
      <main className="flex-1 p-10 bg-white">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}