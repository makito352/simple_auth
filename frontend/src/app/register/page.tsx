"use client";

import { useEffect, useState, Suspense } from "react"; // Suspenseを追加
import { useSearchParams } from "next/navigation";
import { verifyOneTimeLink } from "@/lib/api/ont_time_link";
import { registerWebAuthnDevice } from "@/lib/api/webauthn";

// コンテンツ部分を別コンポーネントとして定義
function RegistrationContent() {
  const searchParams = useSearchParams();
  // URLからトークンを取得 (例: ?token=tok_xxx)
  const token = searchParams.get("token");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function verifyTokenAndStart() {
      const result = await verifyOneTimeLink(token);
      if (result) {
        setIsVerified(true);
      }
    }

    verifyTokenAndStart();
  }, [token]);

  const handleRegister = async () => {
    if (!isVerified) return;

    try {
      // ライブラリ側で定義された登録フローを実行
      await registerWebAuthnDevice();
      
      // 成功したらトップページへリダイレクト
      window.location.href = "/";
    } catch (error) {
      console.error("WebAuthn registration failed:", error);
    }
  };

  if (!isVerified) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>デバイス登録</h1>
        <p>アクセス用リンクを確認しています。少々お待ちください...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>デバイス登録</h1>
      <p>リンクの確認が完了しました。次へ進むには、あなたのデバイスにパスキー（WebAuthn）を登録してください。</p>
      <button onClick={handleRegister}>Register WebAuthn</button>
    </div>
  );
}

// メインのページコンポーネントでSuspenseを適用
export default function WebAuthnRegPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationContent />
    </Suspense>
  );
}
