/**
 * @file frontend/src/app/login/page.tsx
 * @description WebAuthnを使用した生体認証ログイン画面のコンポーネント。
 */
"use client";

import Link from 'next/link';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white shadow-lg rounded-xl border border-gray-200 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">SimpleAuthのログイン</h1>
        <p className="mb-6 text-gray-600">「パスキーでログイン」を押して、パスキーによる認証を開始してください。</p>
        <button 
          onClick={handleNext} 
          disabled={loading}
          className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
            loading 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "認証中..." : "パスキーでログイン"}
        </button>
        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-500 hover:underline">ホームに戻る</Link>
        </div>
      </div>
    </div>
  );
}