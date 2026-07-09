/**
 * @file page.tsx
 * @description WebAuthnデバイス登録ページ
 * ユーザーがパスキー（WebAuthn）を登録するためのUIを提供します。
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyOneTimeLink } from "@/lib/api/one_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import type { ApiError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error";
import { logger } from "@/lib/logger";

/**
 * 登録処理のメインコンテンツを管理するコンポーネント。
 * トークンの検証と、WebAuthnデバイスの登録フローを担当します。
 * @returns 認証状態に応じたUI要素
 */
function RegistrationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * @description コンポーネントのマウント時にURLから取得したトークンを検証する処理。
     */
    async function verifyTokenAndStart() {
      if (!token) {
        setError("登録用リンクが見つかりませんでした。もう一度リンクから開いてください。");
        setLoading(false);
        return;
      }

      try {
        const result = await verifyOneTimeLink(token);
        if (result) {
          setIsVerified(true);
          setError(null);
        }
      } catch (error) {
        const isApiError = (error && typeof error === 'object' && 'status' in error);
        // ApiError型の場合、共通のメッセージから取得。それ以外（通常のError等）の場合は「URL不正です」を表示
        const errorMessage = (isApiError) 
          ? getErrorMessage(error as ApiError, "認証中に問題が発生しました。")
          : "URLが正しくありません。";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    verifyTokenAndStart();
  }, [token]);

  /**
   * @description WebAuthnデバイス登録を実行する処理。
   */
  const handleRegister = async () => {
    if (!isVerified) return;

    setSubmitting(true);
    setError(null);

    try {
      await registerWebAuthnDevice();
      window.location.href = "/";
    } catch (error) {
      logger.error(`WebAuthn registration failed: ${error}`);
      setError("デバイス登録に失敗しました。内容を確認してもう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", maxWidth: "560px", margin: "0 auto" }}>
        <h1>デバイス登録</h1>
        <p>登録用リンクを確認しています。少々お待ちください。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "560px", margin: "0 auto" }}>
      <h1>デバイス登録</h1>
      {isVerified ? (
        <>
          <p>リンクの確認が完了しました。次へ進むには、この端末でパスキーを登録してください。</p>
          {error && <p style={{ color: "#b00020" }}>{error}</p>}
          <button onClick={handleRegister} disabled={submitting}>
            {submitting ? "登録中..." : "パスキーを登録する"}
          </button>
        </>
      ) : (
        <>
          <p>{error ?? "登録用リンクを確認できませんでした。"}</p>
          <button onClick={handleRetry}>再読み込み</button>
        </>
      )}
    </div>
  );
}

/**
 * WebAuthn登録ページのメインエントリーポイント。
 * useSearchParamsの利用に伴うクライアントサイドでのSuspense境界を設定します。
 */
export default function WebAuthnRegPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationContent />
    </Suspense>
  );
}
