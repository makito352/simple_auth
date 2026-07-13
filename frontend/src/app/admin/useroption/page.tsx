/**
 * @file frontend/src/app/admin/useroption/page.tsx
 * @description 管理者用のカスタムフィールド定義ページ
 * このページでは、管理者がシステム内で使用するカスタムフィールド（例: imap_server, smtp_portなど）を定義・更新できます。
 * フォームを通じて新しい属性を追加したり、既存の属性を編集することが可能です。
 * また、属性の暗号化設定も行うことができます。
 */
"use client";

import OptionAttributePage from "@/components/features/admin/useroption/UserOptionAttributeManagementPage";

/**
 * カスタムフィールド定義ページ
 * 管理者がシステム内の設定項目（例: imap_server, smtp_portなど）を定義・更新する画面です。
 */
export default function Page() {
  return <OptionAttributePage />;
}
