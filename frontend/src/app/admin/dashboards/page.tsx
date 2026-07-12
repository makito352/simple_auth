/**
 * @file frontend/src/app/admin/dashboards/page.tsx
 * @description 管理者用のダッシュボードリンク管理ページ（Server Component）
 */
import DashboardsManagerClient from "@/components/features/admin/dashboards/DashboardsManagerClient";
import { fetchDashboardLinksForServer } from "@/lib/api/dashboards_server";

/**
 * ダッシュボードリンク管理ページを表示する。
 * 初期データはサーバーで取得し、操作UIはClient Componentへ委譲する。
 * @returns 管理画面のページ要素
 */
export default async function DashboardsPage() {
  const { links, errorMessage } = await fetchDashboardLinksForServer();

  return (
    <DashboardsManagerClient
      initialLinks={links}
      initialErrorMessage={errorMessage}
    />
  );
}