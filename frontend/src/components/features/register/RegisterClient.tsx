/**
 * @file frontend/src/components/features/register/RegisterClient.tsx
 * @description ワンタイムリンク経由の通常登録画面クライアントコンポーネント。
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, PageWrapper, SuccessCard } from "@/components/ui/common";
import { verifyOneTimeLink } from "@/lib/api/one_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import { logger } from "@/lib/logger";

import { REGISTER_REDIRECT_DELAY_MS, resolveRegisterErrorMessage } from "../../common/common_utils";
import { useSuccessRedirect } from "./useSuccessRedirect";

/**
 * 通常登録画面の受け取りプロパティ。
 */
type RegisterClientProps = {
  token: string | null;
};

/**
 * フロー状態の定義。
 */
type RegisterStep = "verifying" | "registering_device" | "success" | "error";

/**
 * トークン検証からWebAuthn登録までを管理する通常登録画面。
 */
export default function RegisterClient({ token }: RegisterClientProps) {
  const router = useRouter();
  const { redirectAfter } = useSuccessRedirect();

  const [step, setStep] = useState<RegisterStep>("verifying");
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  /**
   * URLトークンを検証し、登録開始可能かを判定する。
   */
  useEffect(() => {
    let isActive = true;

    async function verifyToken() {
      if (!token) {
        if (!isActive) {
          return;
        }

        setGlobalError("登録用リンクが見つかりませんでした。もう一度リンクから開いてください。");
        setStep("error");
        setLoading(false);
        return;
      }

      try {
        await verifyOneTimeLink(token);
        if (!isActive) {
          return;
        }

        setStep("registering_device");
      } catch (error) {
        if (!isActive) {
          return;
        }

        const errorMessage = resolveRegisterErrorMessage(
          error,
          "認証中に問題が発生しました。",
          "URLが正しくありません。",
        );
        setGlobalError(errorMessage);
        setStep("error");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    verifyToken();

    return () => {
      isActive = false;
    };
  }, [token]);

  /**
   * WebAuthnによるデバイス登録を実行する。
   */
  const handleRegister = async () => {
    setLoading(true);
    setGlobalError(null);

    try {
      await registerWebAuthnDevice();
      setStep("success");
      redirectAfter("/", REGISTER_REDIRECT_DELAY_MS);
    } catch (error) {
      logger.error(`WebAuthn registration failed: ${error}`);
      setGlobalError("デバイスの登録に失敗しました。もう一度お試しください。");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">デバイス登録</h1>
        <p className="text-gray-600">
          {step === "verifying" ? "リンクを確認しています..." : "デバイスを登録しています..."}
        </p>
      </div>
    );
  }

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-8 border-b pb-2">デバイス登録</h1>

      {step === "registering_device" && (
        <div className="space-y-4">
          <p className="text-gray-700">
            リンクの確認が完了しました。次へ進むには、この端末でパスキーを登録してください。
          </p>
          {globalError && <p className="text-red-600 font-medium">{globalError}</p>}
          <Button onClick={handleRegister}>パスキーを登録する</Button>
        </div>
      )}

      {step === "error" && (
        <div className="space-y-4">
          <p className="text-red-600 font-medium">{globalError || "エラーが発生しました。"}</p>
          <Button variant="secondary" onClick={() => router.refresh()}>
            再読み込み
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
