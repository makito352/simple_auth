/**
 * @file frontend/src/app/register-init/RegisterInitClient.tsx
 * @description 初期管理者のデバイス登録クライアントコンポーネント
 *
 * このコンポーネントは、初期管理者ログインとパスキー登録の
 * クライアント側フローを提供します。
 */
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginInitialAdmin } from "@/lib/api/init_admin";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import type { ApiError } from "@/lib/api/client";
import { logger } from "@/lib/logger";

/**
 * 初期管理者向け登録処理のメインコンテンツ。
 * 1. 管理者ログイン (init-admin)
 * 2. WebAuthnデバイス登録
 * のフローを管理します。
 */
export function RegisterInitContent() {
  const searchParams = useSearchParams();
  // 既存のパスと同様、メールとパスワードをクエリから取得するか、入力フォームを表示する
  // ここでは「初期管理者ログイン用のURL」から遷移してきたことを想定し、状態を管理します。
  const email = searchParams.get("email");
  const password = searchParams.get("password");

  const [step, setStep] = useState<"login" | "verifying_auth" | "registering_device">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * @description 1. 初期管理者としての認証を行う処理。
   */
  const handleInitialLogin = async () => {
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("verifying_auth");

    try {
      // init_admin.py の /auth/init-admin/login を叩く
      await loginInitialAdmin({ email, password });
      // ログイン成功（クッキーセット）後、自動的にWebAuthn登録へ移行する準備
      setStep("registering_device");
    } catch (err) {
      logger.error(`Initial Admin Login failed: ${err}`);
      const apiError = err as ApiError;
      setError(apiError?.status === 404 ? "認証に失敗しました。情報を確認してください。" : "エラーが発生しました。");
      setStep("login"); // エラー時はログイン画面に戻す
    } finally {
      setLoading(false);
    }
  };

  /**
   * @description 2. WebAuthnによるデバイス登録を実行する処理。
   */
  const handleWebAuthnRegistration = async () => {
    setLoading(true);
    setError(null);

    try {
      // webauthn.ts の registerWebAuthnDevice を呼び出す
      await registerWebAuthnDevice();
      // 成功したらトップへ（または管理画面へ）
      window.location.href = "/";
    } catch (err) {
      logger.error(`WebAuthn registration failed: ${err}`);
      setError("デバイスの登録に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">処理中...</h1>
        <p className="text-gray-600">{step === "verifying_auth" ? "認証を確認しています..." : "デバイスを登録しています..."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8 border-b pb-2">初期管理者デバイス登録</h1>

      {step === "login" && (
        <div className="space-y-4">
          <p className="text-gray-700">初期管理者のログイン情報を入力してください。</p>
          {error && <p className="text-red-600 font-medium">{error}</p>}
          <div className="space-y-2">
            <input
              type="email"
              placeholder="admin@example.com"
              className="w-full p-2 border rounded"
              defaultValue={email ?? ""}
            />
            <input
              type="password"
              placeholder="パスワード"
              className="w-full p-2 border rounded"
              defaultValue={password ?? ""}
            />
          </div>
          <button
            onClick={handleInitialLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            認証を実行
          </button>
        </div>
      )}

      {step === "registering_device" && (
        <div className="space-y-4">
          <p className="text-gray-700">
            認証に成功しました。次に、この端末を管理用デバイスとして登録するためのパスキーを設定してください。
          </p>
          {error && <p className="text-red-600 font-medium">{error}</p>}
          <button
            onClick={handleWebAuthnRegistration}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            パスキーを登録する
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * SearchParams利用に伴うSuspense境界を持つエントリコンポーネント。
 */
export default function RegisterInitClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterInitContent />
    </Suspense>
  );
}
