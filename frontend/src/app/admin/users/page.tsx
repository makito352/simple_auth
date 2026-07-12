/**
 * @file frontend/src/app/admin/users/page.tsx
 * @description ユーザー管理ページのコンポーネント。ユーザーの一覧表示、作成、編集、削除を行う。
 */
"use client";

import UsersManagementPage from "@/components/features/admin/users/UsersManagementPage";

/**
 * ユーザー管理ページ
 * 管理者がシステム内のユーザーを管理する画面です。
 */
export default function Page() {
  return <UsersManagementPage />;
}
