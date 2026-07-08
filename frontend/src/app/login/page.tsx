/**
 * @file page.tsx
 * @description WebAuthnを使用した生体認証ログイン画面のコンポーネント。
 */
"use client";

import { useState } from "react";
import { performWebAuthnLogin } from "@/lib/api/webauthn";
import { logger } from "@/lib/logger";

/**
 * ログインページのメインコンポーネント
 * @returns JSX.Element ログインボタンを含むUI要素
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  /**
   * 「次へ」ボタン押下時の処理。
   * WebAuthn認証を実行し、成功した場合はダッシュボードへ遷移します。
   */
  async function handleNext() {
    setLoading(true);
    try {
      // WebAuthnの全工程を実行
      await performWebAuthnLogin();
      
      // 認証成功時、ダッシュボードへ遷移
      window.location.href = "/dashboard";
    } catch (err) {
       // エラー内容をコンソールに記録し、ユーザーにアラートを表示
      logger.error(`Login failed: ${err}`);
      alert("認証に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <p>「次へ」を押して生体認証を開始してください</p>
      <button onClick={handleNext} disabled={loading}>
        {loading ? "認証中..." : "次へ (生体認証)"}
      </button>
    </div>
  );
}