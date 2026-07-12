/**
 * @file frontend/src/app/admin/oidc/page.tsx
 * @description OIDC管理画面のルーティングエントリ
 */
import OidcManagementPage from "@/components/features/admin/oidc/OidcManagementPage";

/**
 * OIDC管理ページ
 * feature コンポーネントを呼び出すだけの薄いルートです。
 * @returns OIDC管理画面
 */
export default function Page() {
  return <OidcManagementPage />;
}