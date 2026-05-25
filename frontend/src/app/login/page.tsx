// "use client";

// import { useState } from "react";
// import { apiPost } from "@/lib/api/client";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");

//   async function handleSubmit() {
//     const res = await apiPost("/webauthn/login/options", { email });
//     window.location.href = `/login/webauthn?email=${email}`;
//   }

//   return (
//     <div>
//       <h1>Login</h1>
//       <input value={email} onChange={(e) => setEmail(e.target.value)} />
//       <button onClick={handleSubmit}>Next</button>
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { webauthnLogin } from "@/lib/webauthn"; // 認証用ヘルパー

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    setLoading(true);
    try {
      // 1. サーバーからオプション（チャレンジ含む）を取得
      const options = await apiPost("/webauthn/login/options", { email });

      // 2. そのままブラウザの生体認証を起動！
      const cred = await webauthnLogin(options);

      // 3. 検証APIを叩く
      await apiPost("/webauthn/login/verify", cred);

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
      <p>メールアドレスを入力してください</p>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="test@test.com"
      />
      <button onClick={handleNext} disabled={loading || !email}>
        {loading ? "認証中..." : "次へ (生体認証)"}
      </button>
    </div>
  );
}