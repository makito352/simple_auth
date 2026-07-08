/**
 * @file page.tsx
 * @description 追加デバイス登録用ページ。
 * URLに含まれるワンタイムトークンを検証し、有効な場合はWebAuthnによるデバイス登録フローを開始します。
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyOneTimeLink } from "@/lib/api/ont_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import { logger } from "@/lib/logger";

/**
 * @component DeviceAddContent
 * @description トークンの検証状態と登録処理を管理するメインコンテンツコンポーネント。
 * @returns 検証中、エラー時、または成功時の状態に応じたUI。
 */
function DeviceAddContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * @description コンポーネントのマウント時にURLから取得したトークンを検証する処理。
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

      window.location.href = "/devices";
    } catch (e) {
      logger.error(`Failed to register WebAuthn device: ${e}`);
      setError("追加デバイス登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  // ロード中の状態（初期検証中）
  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>追加デバイス登録</h1>
        <p>リンクを確認しています。少々お待ちください...</p>
      </div>
    );
  }

  // 検証失敗またはエラー発生時の状態
  if (!isVerified) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>追加デバイス登録</h1>
        <p>{error ?? "登録リンクを確認できませんでした。"}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>追加デバイス登録</h1>
      <p>確認が完了しました。新しいデバイスでパスキー登録を実行してください。</p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <button onClick={handleRegisterDevice} disabled={submitting}>
        {submitting ? "登録中..." : "このデバイスを登録"}
      </button>
    </div>
  );
}

export default function DeviceAddPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeviceAddContent />
    </Suspense>
  );
}
