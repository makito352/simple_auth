"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { webauthnLogin } from "@/lib/webauthn"; // 認証用ヘルパー

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  async function handleNext() {
    setLoading(true);
    try {
      // 1. サーバーからオプション（チャレンジ含む）を取得
      // メールアドレスを伴わないリクエストに変更
      const response = await apiPost("/webauthn/login/options");

      // backendのレスポンス構造: { options: {...}, session_token: "..." }
      const webauthnOptions = response.options; 
      const sessionToken = response.session_token;

      // 2. ブラウザの生体認証を実行
      const cred = await webauthnLogin(webauthnOptions);

      // 3. 検証APIを叩く（credentialとsession_tokenを両方送る）
      await apiPost("/webauthn/login/verify", {
        ...cred,
        session_token: sessionToken,
      });
      
      // 4. 成功したら一気にダッシュボードへ
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