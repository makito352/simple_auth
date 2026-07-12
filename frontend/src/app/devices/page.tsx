/**
 * @file frontend/src/app/devices/page.tsx
 * @description ログイン中ユーザーのWebAuthnデバイス管理画面。
 * デバイス一覧の表示、コメントの更新、および新規デバイス登録用リンクの発行機能を備えています。
 */
"use client";

import DevicesPage from "@/components/features/devices/DevicesPage";

/**
 * デバイス管理ページ。
 * コンポーネントの実装は DevicesPage.tsx に集約されています。
 */
export default function Page() {
  return <DevicesPage />;
}