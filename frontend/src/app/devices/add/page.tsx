"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api/client";
import { detectClientOs, webauthnRegister } from "@/lib/webauthn";

/**
 * @file page.tsx
 * @description 追加デバイス登録専用ページ。tokenを検証後、専用WebAuthn APIで登録する。
 */
function DeviceAddContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("トークンが指定されていません。");
        setLoading(false);
        return;
      }

      try {
        const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
        if (response && response.user_id) {
          setIsVerified(true);
        } else {
          setError("トークンの検証に失敗しました。");
        }
      } catch (e) {
        console.error(e);
        setError("トークンが無効か期限切れです。");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  async function handleRegisterDevice() {
    if (!isVerified) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const options = await apiPost("/webauthn/devices/register/options");
      const credential = await webauthnRegister(options);

      if (!credential) {
        setError("WebAuthn資格情報の取得に失敗しました。");
        return;
      }

      await apiPost("/webauthn/devices/register/verify", {
        ...credential,
        device_name: detectClientOs(),
      });

      window.location.href = "/devices";
    } catch (e) {
      console.error(e);
      setError("追加デバイス登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>追加デバイス登録</h1>
        <p>リンクを確認しています。少々お待ちください...</p>
      </div>
    );
  }

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
