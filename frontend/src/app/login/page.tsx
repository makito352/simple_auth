/**
 * @file frontend/src/app/login/page.tsx
 * @description WebAuthnを使用した生体認証ログイン画面のコンポーネント。
 */
"use client";

import LoginPage from "@/components/features/login/LoginPage";

/**
 * ログインページのメインコンポーネント
 * @returns JSX.Element ログインボタンを含むUI要素
 */
export default function Page() {
  return <LoginPage />;
}
