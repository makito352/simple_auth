"use client";

import { useEffect, useState, Suspense } from "react"; // Suspenseを追加
import { useSearchParams } from "next/navigation";
import { apiPost,apiGet } from "@/lib/api/client";
import { webauthnRegister } from "@/lib/webauthn";

// コンテンツ部分を別コンポーネントとして定義
function RegistrationContent() {
  const searchParams = useSearchParams();
  // URLからトークンを取得 (例: ?token=tok_xxx)
  const token = searchParams.get("token");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function verifyTokenAndStart() {
      if (!token) {
        console.error("No token provided in URL");
        return;
      }

      try {
        // バックエンドでトークンを検証し、消費する
        const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
        
        if (response && response.user_id) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error("Failed to verify token:", error);
      }
    }

    verifyTokenAndStart();
  }, [token]);

  const handleRegister = async () => {
    if (!isVerified) return;

    try {
      // 検証済みであれば、WebAuthnの登録フローを実行
      // console.log("Step 1: Fetching WebAuthn options...");
      const options = await apiPost("/webauthn/register/options");
      // console.log("Options received:", options);

      // console.log("Step 2: Executing webauthnRegister with provided options...");
      const cred = await webauthnRegister(options);
      if (!cred) {
        console.error("Credential is null/undefined");
      }
      // console.log("Credential received from device:", cred);

      // console.log("Step 3: Verifying credentials on server...");
      const verifyResponse = await apiPost("/webauthn/register/verify", cred);
      // console.log("Verification response from server:", verifyResponse);

      // トップページへリダイレクト
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
