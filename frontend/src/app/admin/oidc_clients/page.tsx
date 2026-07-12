/**
 * @file frontend/src/app/admin/oidc_clients/page.tsx
 * @description OIDCクライアント管理画面
 * 
 * このページでは、OIDC（OpenID Connect）のクライアント情報の閲覧、新規作成、編集、
 * およびシークレットの再発行を行うことができます。
 * セキュリティの観点から、シークレットの平文は常にマスクされ、コピー機能を通じてのみ取得可能となります。
 */

"use client";
import OidcClientsManagementPage from "@/components/features/admin/oidc-clients/OidcClientsManagementPage";

/**
 * OIDCクライアント管理のメインコンポーネント
 * @returns OIDCクライアント管理画面
 */
export default function Page() {
  return <OidcClientsManagementPage />;
}
