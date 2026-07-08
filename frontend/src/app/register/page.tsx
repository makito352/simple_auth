/**
 * @file page.tsx
 * @description WebAuthnデバイス登録ページ
 * ユーザーがパスキー（WebAuthn）を登録するためのUIを提供します。
 */
"use client";

import { useEffect, useState, Suspense } from "react"; // Suspenseを追加
import { useSearchParams } from "next/navigation";
import { verifyOneTimeLink } from "@/lib/api/ont_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";
import { logger } from "@/lib/logger";

/**
 * 登録処理のメインコンテンツを管理するコンポーネント。
 * トークンの検証と、WebAuthnデバイスの登録フローを担当します。
 * @returns 認証状態に応じたUI要素
 */
function RegistrationContent() {
  const searchParams = useSearchParams();
  // URLからトークンを取得 (例: ?token=tok_xxx)
  const token = searchParams.get("token");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    /**
     * @description コンポーネントのマウント時にURLから取得したトークンを検証する処理。
     */
    async function verifyTokenAndStart() {
      const result = await verifyOneTimeLink(token);
      if (result) {
        setIsVerified(true);
      }
    }

    verifyTokenAndStart();
  }, [token]);

  /**
   * @description WebAuthnデバイス登録を実行する処理。
   */
  const handleRegister = async () => {
    if (!isVerified) return;

    try {
      // ライブラリ側で定義された登録フローを実行
      await registerWebAuthnDevice();
      
      // 成功したらトップページへリダイレクト
      window.location.href = "/";
    } catch (error) {
      logger.error(`WebAuthn registration failed: ${error}`);
    }
  };

  // トークン検証中の表示（ローディング状態）
  if (!isVerified) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>デバイス登録</h1>
        <p>アクセス用リンクを確認しています。少々お待ちください...</p>
      </div>
    );
  }

  // 検証完了後の表示
  return (
    <div style={{ padding: "20px" }}>
      <h1>デバイス登録</h1>
      <p>リンクの確認が完了しました。次へ進むには、あなたのデバイスにパスキー（WebAuthn）を登録してください。</p>
      <button onClick={handleRegister}>Register WebAuthn</button>
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
