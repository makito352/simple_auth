"use client";

import { useState } from "react";
import { performWebAuthnLogin } from "@/lib/api/webauthn";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  async function handleNext() {
    setLoading(true);
    try {
      // WebAuthnの全工程を実行
      await performWebAuthnLogin();
      
      // 成功したら一気にダッシュボードへ
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login failed", err);
      alert("認証に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <p>「次へ」を押して生体認証を開始してください</p>
      <button onClick={handleNext} disabled={loading}>
        {loading ? "認証中..." : "次へ (生体認証)"}
      </button>
    </div>
  );
}