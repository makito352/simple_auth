"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createDeviceRegistrationLink,
  deleteDeviceCredential,
  fetchDeviceCredentials,
  type DeviceCredential,
  type DeviceRegistrationLink,
  updateDeviceComment,
} from "@/lib/api/devices";
import { logger } from "@/lib/logger";

/**
 * @file page.tsx
 * @description ログイン中ユーザーのWebAuthnデバイス管理画面。
 */

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ja-JP");
}

function normalizeCommentInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceCredential[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [registrationLink, setRegistrationLink] = useState<DeviceRegistrationLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  async function loadDevices() {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDeviceCredentials();
      setDevices(rows);

      const drafts: Record<string, string> = {};
      rows.forEach((row) => {
        drafts[row.credential_id] = row.user_comment ?? "";
      });
      setCommentDrafts(drafts);
    } catch (e) {
      logger.error(`Failed to fetch device credentials: ${e}`);
      setError("デバイス一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  function onChangeComment(credentialId: string, value: string) {
    setCommentDrafts((prev) => ({ ...prev, [credentialId]: value }));
  }

  async function onSaveComment(credentialId: string) {
    setSavingId(credentialId);
    setError(null);
    try {
      const comment = normalizeCommentInput(commentDrafts[credentialId] ?? "");
      await updateDeviceComment(credentialId, comment);
      setDevices((prev) =>
        prev.map((row) =>
          row.credential_id === credentialId
            ? {
                ...row,
                user_comment: comment,
              }
            : row,
        ),
      );
    } catch (e) {
      logger.error(`Failed to update device comment: ${e}`);
      setError("コメントの更新に失敗しました。");
    } finally {
      setSavingId(null);
    }
  }

  async function onDeleteDevice(credentialId: string) {
    const confirmed = window.confirm("このデバイスを削除します。よろしいですか？");
    if (!confirmed) {
      return;
    }

    setDeletingId(credentialId);
    setError(null);
    try {
      await deleteDeviceCredential(credentialId);
      setDevices((prev) => prev.filter((row) => row.credential_id !== credentialId));
      setCommentDrafts((prev) => {
        const next = { ...prev };
        delete next[credentialId];
        return next;
      });
    } catch (e) {
      logger.error(`Failed to delete device credential: ${e}`);
      setError("デバイスの削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  }

  async function onCreateRegistrationLink() {
    setLinkLoading(true);
    setError(null);
    try {
      const link = await createDeviceRegistrationLink();
      setRegistrationLink(link);

      // 外部APIへリンク情報を送らず、ローカルでQRを生成する。
      const qrcode = await import("qrcode");
      const generated = await qrcode.toDataURL(link.url, {
        width: 220,
        margin: 2,
      });
      setQrDataUrl(generated);
    } catch (e) {
      logger.error(`Failed to create registration link: ${e}`);
      setError("追加デバイス登録リンクの発行に失敗しました。");
      setQrDataUrl(null);
    } finally {
      setLinkLoading(false);
    }
  }

  async function onCopyRegistrationLink() {
    if (!registrationLink?.url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(registrationLink.url);
      window.alert("登録リンクをコピーしました。");
    } catch (e) {
      logger.error(`Failed to copy registration link: ${e}`);
      setError("リンクのコピーに失敗しました。");
    }
  }

  const hasDevices = useMemo(() => devices.length > 0, [devices]);

  return (
    <main style={{ padding: 24 }}>
      {/* Launcherに戻るリンクを追加 */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard" style={{ color: "#0070f3", textDecoration: "underline" }}>
          ← 🏠Launcherに戻る
        </Link>
      </div>
      <h1>デバイス管理</h1>
      <p style={{ marginBottom: 16 }}>
        ログイン中ユーザーのWebAuthnデバイス一覧です。コメント編集と削除が行えます。
      </p>

      <section
        style={{
          marginBottom: 24,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h2>新しいデバイスを追加</h2>
        <p>5分間有効のワンタイムリンクを発行し、別デバイスで開いて登録します。</p>
        <button type="button" onClick={onCreateRegistrationLink} disabled={linkLoading}>
          {linkLoading ? "発行中..." : "追加デバイス登録リンクを発行"}
        </button>

        {registrationLink && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <p>有効期限: {formatDate(registrationLink.expires_at)}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                readOnly
                value={registrationLink.url}
                style={{ flex: 1, minWidth: 280, padding: "6px 8px" }}
              />
              <button type="button" onClick={onCopyRegistrationLink}>
                コピー
              </button>
            </div>
            <a href={registrationLink.url} target="_blank" rel="noreferrer">
              このリンクを新しいデバイスで開く
            </a>
            {qrDataUrl && (
              <div
                style={{
                  width: 220,
                  height: 220,
                  border: "1px solid #ddd",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={qrDataUrl} alt="追加デバイス登録用QRコード" width={220} height={220} />
              </div>
            )}
          </div>
        )}
      </section>

      {error && <p style={{ color: "#b00020", marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : !hasDevices ? (
        <p>登録済みデバイスはありません。</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "left" }}>OS</th>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "left" }}>登録日</th>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "left" }}>コメント</th>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "left" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const isSaving = savingId === device.credential_id;
              const isDeleting = deletingId === device.credential_id;
              return (
                <tr key={device.id}>
                  <td style={{ border: "1px solid #ddd", padding: 8 }}>{device.device_name ?? "Unknown"}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8 }}>{formatDate(device.created_at)}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8 }}>
                    <input
                      type="text"
                      value={commentDrafts[device.credential_id] ?? ""}
                      onChange={(e) => onChangeComment(device.credential_id, e.target.value)}
                      maxLength={255}
                      placeholder="例: WindowsメインPC / WindowsノートPC / 個人スマホ"
                      disabled={isDeleting}
                      style={{ width: "95%", minWidth: 240, padding: "6px 8px" }}
                    />
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: 8 }}>
                    <div style={{ display: "flex", gap: 8, whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => onSaveComment(device.credential_id)}
                        disabled={isSaving || isDeleting}
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDevice(device.credential_id)}
                        disabled={isSaving || isDeleting}
                      >
                        {isDeleting ? "削除中..." : "削除"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
