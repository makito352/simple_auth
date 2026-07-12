/**
 * @file frontend/src/components/features/devices/useRegistrationLink.ts
 * @description ワンタイムリンク発行・QRコード生成・コピー処理を管理するカスタムフック。
 */

import { useState } from "react";

import { createDeviceRegistrationLink } from "@/lib/api/one_time_link";
import { getErrorMessage } from "@/lib/error";
import type { OneTimeLinkCreateResponse } from "@/types";

/**
 * 登録用リンク発行・QRコード生成・コピー処理を管理するカスタムフック。
 */
export function useRegistrationLink() {
  const [linkLoading, setLinkLoading] = useState(false);
  const [registrationLink, setRegistrationLink] = useState<OneTimeLinkCreateResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * リンク発行完了時のコピー待機時間（ミリ秒）。
   */
  const COPY_TIMEOUT_MS = 2000;

  /**
   * 新しいデバイス登録用のワンタイムリンクを発行し、QRコードを生成します。
   */
  async function onCreateRegistrationLink() {
    setLinkLoading(true);
    setError(null);
    try {
      const link = await createDeviceRegistrationLink();
      setRegistrationLink(link);

      // 動的インポートによりqrcodeライブラリを使用し、QRコードをDataURLとして取得。
      const qrcode = await import("qrcode");
      const generated = await qrcode.toDataURL(link.url, { width: 220, margin: 2 });
      setQrDataUrl(generated);
    } catch (e) {
      const errorMessage = getErrorMessage(e, "追加デバイス登録リンクの発行に失敗しました");
      setError(errorMessage);
      setRegistrationLink(null);
      setQrDataUrl(null);
    } finally {
      setLinkLoading(false);
    }
  }

  /**
   * 発行された登録用URLをクリップボードにコピーします。
   */
  async function onCopyRegistrationLink() {
    if (!registrationLink?.url) return;
    try {
      await navigator.clipboard.writeText(registrationLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_TIMEOUT_MS);
    } catch (e) {
      const errorMessage = getErrorMessage(e, "リンクのコピーに失敗しました");
      setError(errorMessage);
    }
  }

  return { linkLoading, registrationLink, qrDataUrl, copied, error, onCopyRegistrationLink, onCreateRegistrationLink };
}