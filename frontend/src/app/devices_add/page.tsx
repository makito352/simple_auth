/**
 * @file frontend/src/app/devices_add/page.tsx
 * @description 追加デバイス登録用ページ。
 * URLに含まれるワンタイムトークンを検証し、有効な場合はWebAuthnによるデバイス登録フローを開始します。
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyOneTimeLink } from "@/lib/api/one_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import { LoadingSpinner } from "@/app/components/loading-spinner";
import { logger } from "@/lib/logger";

/**
 * @component DeviceAddContent
 * @description トークンの検証状態と登録処理を管理するメインコンテンツコンポーネント。
 * 
 * @details 
 * 1. URLからトークンを取得
 * 2. バックエンドへの問い合わせによるトークン検証（初回ロード時）
 * 3. 検証成功後のWebAuthnデバイス登録フローの実行
 * 
 * @returns 検証中、エラー時、または成功時の状態に応じたUI。
 */
function DeviceAddContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

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
   * 効果: トークンが有効であれば `isVerified` を true に更新します。
   */
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("トークンが指定されていません。");
        setLoading(false);
        return;
      }

      try {
        const result = await verifyOneTimeLink(token);
        if (result) {
          setIsVerified(true);
        } else {
          setError("トークンの検証に失敗しました。");
        }
      } catch (e) {
        logger.error(`Failed to verify one-time link: ${e}`);
        setError("トークンが無効か期限切れです。");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  /**
   * @description WebAuthnによるデバイス登録を実行する処理。
   * 
   * @details
   * 検証済みの場合のみ実行され、成功した場合は一覧ページへリダイレクトします。
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

      // 成功時、デバイス一覧ページへ遷移
      window.location.href = "/devices";
    } catch (e) {
      logger.error(`Failed to register WebAuthn device: ${e}`);
      setError("追加デバイス登録に失敗しました。");
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