/**
 * @file frontend/src/app/register-init/RegisterInitClient.tsx
 * @description 初期管理者のデバイス登録クライアントコンポーネント
 */
"use client";

import { Suspense, useState } from "react";
import { loginInitialAdmin } from "@/lib/api/init_admin";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import type { ApiError } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import { validateEmail } from "@/lib/utils";

/**
 * エラー状態の定義
 */
type ValidationErrors = {
  email?: string;
  password?: string;
};

/**
 * 初期管理者向け登録処理のメインコンテンツ。
 */
export function RegisterInitContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep] = useState<"login" | "verifying_auth" | "registering_device" | "success">("login");
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  // 自動遷移の遅延時間（ミリ秒）
  const redirectDelay = 3000

  /**
   * @description 初期管理者としての認証を行う処理。
   */
  const handleInitialLogin = async () => {
    let emailValidationError: string | null = null;
    let passwordValidationError: string | null = null;

    if (!email ) {
      emailValidationError = "メールアドレスとパスワードを入力してください。";
    } 
    if (!password) {
      passwordValidationError = "メールアドレスとパスワードを入力してください。";
    } 
    if (!validateEmail(email)) {
      emailValidationError = "正しいメールアドレスの形式で入力してください。";
    } 
    if (password.length < 8) {
      passwordValidationError = "パスワードは8文字以上で入力してください。";
    }

    if (emailValidationError || passwordValidationError) {
      logger.debug(`Validation failed: ${emailValidationError || passwordValidationError}`);
      setErrors({ email: emailValidationError, password: passwordValidationError });
      return;
    }


    setLoading(true);
    setErrors({});
    setGlobalError(null);
    setStep("verifying_auth");

    try {
      await loginInitialAdmin({ email, password });
      setStep("registering_device");
    } catch (err) {
      logger.error(`Initial Admin Login failed: ${err}`);
      const apiError = err as ApiError;
      setGlobalError(apiError?.status === 404 ? "認証に失敗しました。情報を確認してください。" : "エラーが発生しました。");
      setStep("login");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @description WebAuthnによるデバイス登録を実行する処理。
   */
  const handleWebAuthnRegistration = async () => {
    setLoading(true);
    setErrors({});
    setGlobalError(null);

    try {
      await registerWebAuthnDevice();
      setStep("success"); // 成功ステータスへ移行
      // 自動遷移を少し遅らせるか、ユーザーが確認できるようにする
      setTimeout(() => {
        window.location.href = "/";
      }, redirectDelay);
    } catch (err) {
      logger.error(`WebAuthn registration failed: ${err}`);
      setGlobalError("デバイスの登録に失敗しました。もう一度お試しください。");
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
          {globalError && <p className="text-red-600 font-medium">{globalError}</p>}
          <div className="space-y-2">
            {/* メール入力欄 */}
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              placeholder="admin@example.com"
              className={`w-full p-2 border rounded ${errors.email ? "border-red-500 bg-red-50" : "border-gray-300"}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            {/* パスワード入力欄 */}
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              placeholder="パスワード"
              className={`w-full p-2 border rounded ${errors.password ? "border-red-500 bg-red-50" : "border-gray-300"}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
          </div>
          {/* 認証ボタン */}
          <button
            onClick={handleInitialLogin}
            disabled={!email || !password}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
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
          {globalError && <p className="text-red-600 font-medium">{globalError}</p>}
          {/* パスキー登録ボタン */}
          <button
            onClick={handleWebAuthnRegistration}
            disabled={!email || !password}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            パスキーを登録する
          </button>
        </div>
      )}
      {step === "success" && (
        <div className="space-y-4 text-center">
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-green-800 mb-2">登録が完了しました</h2>
            <p className="text-gray-700">
              デバイスの登録に成功しました。
            </p>
            <p className="mt-4 text-sm text-gray-600">
                {redirectDelay / 1000}秒後にトップページへ移動します。移動後、ログイン画面からログインを行ってください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Suspense境界を持つエントリコンポーネント。
 */
export default function RegisterInitClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterInitContent />
    </Suspense>
  );
}