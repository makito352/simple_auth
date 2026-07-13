/**
 * @file frontend/src/components/features/register/DeviceAddPage.tsx
 * @description 追加デバイス登録用ページ。
 * URLに含まれるワンタイムトークンを検証し、有効な場合はWebAuthnによるデバイス登録フローを開始します。
 */
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { REGISTER_REDIRECT_DELAY_MS } from "@/components/common/common_utils";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { verifyOneTimeLink } from "@/lib/api/one_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import { getErrorMessage } from "@/lib/error";
import { logger } from "@/lib/logger";

import { useSuccessRedirect } from "./useSuccessRedirect";

/**
 * @component DeviceAddContent
 * @description トークンの検証状態と登録処理を管理するメインコンテンツコンポーネント。
 */
function DeviceAddContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { redirectAfter } = useSuccessRedirect();

  // --- ステート管理 ---
  /** @type {boolean} トークンが正しく検証されたか */
  const [isVerified, setIsVerified] = useState(false);
  /** @type {boolean} 初期ロード時または通信中のローディング状態 */
  const [loading, setLoading] = useState(true);
  /** @type {boolean} WebAuthn実行中の送信中ステータス */
  const [submitting, setSubmitting] = useState(false);
  /** @type {string|null} エラーメッセージの保持 */
  const [error, setError] = useState<string | null>(null);

  /**
   * @description コンポーネントのマウント時にURLから取得したトークンを検証する処理。
   */
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        logger.warn("No token found in URL for device registration");
        setError("無効なアクセスリンクです。再度、元のページからQRコードを読み取るかURLをコピーしてください。");
        setLoading(false);
        return;
      }

      try {
        await verifyOneTimeLink(token);
        setIsVerified(true);
      } catch (e) {
        const errorMessage = getErrorMessage(e, "トークンが無効か期限切れです。");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  /**
   * @description WebAuthnによるデバイス登録を実行する処理。
   */
  async function handleRegisterDevice() {
    if (!isVerified) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // 統合されたWebAuthn登録フローを呼び出す
      await registerWebAuthnDevice();

      // 他のページと共通のロジックでリダイレクトを実行
      redirectAfter("/devices", REGISTER_REDIRECT_DELAY_MS);
    } catch (e) {
      const errorMessage = getErrorMessage(e, "追加デバイス登録に失敗しました。");
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  /** 
   * ロード中の状態（初期検証中）のレンダリング 
   */
  if (loading) return <LoadingSpinner />;

  /** 
   * 検証失敗またはエラー発生時のUI 
   */
  if (!isVerified) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">追加デバイス登録</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          <p>{error ?? "登録リンクを確認できませんでした。"}</p>
        </div>
      </div>
    );
  }

  /** 
   * 検証成功時、ユーザーに操作を促すメインUI 
   */
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">追加デバイス登録</h1>
      <p className="mb-6 text-gray-600">
        確認が完了しました。新しいデバイスでパスキー登録を実行してください。
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleRegisterDevice}
        disabled={submitting}
        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
          submitting 
            ? "bg-gray-300 cursor-not-allowed" 
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {submitting ? "登録中..." : "このデバイスを登録"}
      </button>
    </div>
  );
}

/**
 * @component DeviceAddPage
 * @description ページエントリポイント。Suspenseを使用してクライアントサイドのSearchParams取得に対応します。
 */
export default function DeviceAddPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <DeviceAddContent />
    </Suspense>
  );
}