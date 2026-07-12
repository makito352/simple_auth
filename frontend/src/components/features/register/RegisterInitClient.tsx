/**
 * @file frontend/src/components/features/register/RegisterInitClient.tsx
 * @description 初期管理者のデバイス登録クライアントコンポーネント
 */
"use client";

import { useState } from "react";

import { Button, PageWrapper, SuccessCard } from "@/components/ui/common";
import { loginInitialAdmin } from "@/lib/api/init_admin";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import { logger } from "@/lib/logger";
import { validateEmail } from "@/lib/utils";

import { isApiError, REGISTER_REDIRECT_DELAY_MS, resolveRegisterErrorMessage } from "../../common/register_shared";
import { useSuccessRedirect } from "./useSuccessRedirect";

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
  const { redirectAfter } = useSuccessRedirect();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep] = useState<"login" | "verifying_auth" | "registering_device" | "success">("login");
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * @description 初期管理者としての認証を行う処理。
   */
  const handleInitialLogin = async () => {
    let emailValidationError: string | null = null;
    let passwordValidationError: string | null = null;

    if (!email) {
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
    } catch (error) {
      logger.error(`Initial Admin Login failed: ${error}`);

      if (isApiError(error) && error.status === 404) {
        setGlobalError("認証に失敗しました。情報を確認してください。");
      } else {
        setGlobalError(resolveRegisterErrorMessage(error, "認証中に問題が発生しました。", "エラーが発生しました。"));
      }

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
      redirectAfter("/", REGISTER_REDIRECT_DELAY_MS);
    } catch (error) {
      logger.error(`WebAuthn registration failed: ${error}`);
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
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-8 border-b pb-2">初期管理者デバイス登録</h1>

      {step === "login" && (
        <div className="space-y-4">
          <p className="text-gray-700">初期管理者のログイン情報を入力してください。</p>
          {globalError && <p className="text-red-600 font-medium">{globalError}</p>}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              placeholder="admin@example.com"
              className={`w-full p-2 border rounded ${errors.email ? "border-red-500 bg-red-50" : "border-gray-300"}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
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
          <Button onClick={handleInitialLogin} disabled={!email || !password}>
            認証を実行
          </Button>
        </div>
      )}

      {step === "registering_device" && (
        <div className="space-y-4">
          <p className="text-gray-700">
            認証に成功しました。次に、この端末を管理用デバイスとして登録するためのパスキーを設定してください。
          </p>
          {globalError && <p className="text-red-600 font-medium">{globalError}</p>}
          <Button onClick={handleWebAuthnRegistration} disabled={!email || !password}>
            パスキーを登録する
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="space-y-4 text-center">
          <SuccessCard
            title="登録が完了しました"
            message="デバイスの登録に成功しました。"
            subtext={`${REGISTER_REDIRECT_DELAY_MS / 1000}秒後にトップページへ移動します。移動後、ログイン画面からログインを行ってください。`}
          />
        </div>
      )}
    </PageWrapper>
  );
}
/**
 * 初期管理者登録のクライアントエントリコンポーネント。
 */
export default function RegisterInitClient() {
  return <RegisterInitContent />;
}