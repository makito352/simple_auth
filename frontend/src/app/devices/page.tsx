/**
 * @file page.tsx
 * @description ログイン中ユーザーのWebAuthnデバイス管理画面。
 * デバイス一覧の表示、コメントの更新、および新規デバイス登録用リンクの発行機能を備えています。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteDeviceCredential,
  fetchDeviceCredentials,
  updateDeviceComment,
} from "@/lib/api/devices";
import { createDeviceRegistrationLink } from "@/lib/api/one_time_link";
import type { DeviceCredential, OneTimeLinkCreateResponse } from "@/types";
import { getErrorMessage } from "@/lib/error";
import Image from "next/image";


/**
 * ISO 8601形式の日付文字列を日本向けのローカル形式に変換します。
 * @param {string} iso - ISO 8601形式の日付文字列
 * @returns {string} 整形された日付文字列（失敗した場合は "-" を返す）
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ja-JP");
}

/**
 * 入力されたコメントの前後にある空白を削除し、空文字の場合はnullを返します。
 * @param {string} value - ユーザーが入力した生の文字列
 * @returns {string | null} トリミング後の文字列、またはnull
 */
function normalizeCommentInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * デバイス管理ページのメインコンポーネント。
 * デバイス一覧の取得、コメント更新、削除、および新規登録リンクの発行をハンドリングします。
 */
export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceCredential[]>([]);
  // 入力中のコメントを一時的に保持するオブジェクト（キーはcredential_id）
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [registrationLink, setRegistrationLink] = useState<OneTimeLinkCreateResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  /**
   * コンポーネントマウント時にデバイス情報を取得します。
   */
  useEffect(() => {
    let isMounted = true;

    fetchDeviceCredentials()
      .then((rows) => {
        if (!isMounted) {
          return;
        }

        // 初期データの読み込み時にドラフト状態を同期
        const drafts: Record<string, string> = {};
        rows.forEach((row) => {
          drafts[row.credential_id] = row.user_comment ?? "";
        });
        setDevices(rows);
        setCommentDrafts(drafts);
      })
      .catch((e) => {
        if (!isMounted) {
          return;
        }
        const errorMessage = getErrorMessage(e, "デバイス一覧の取得に失敗しました");
        setError(errorMessage);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * デバイスのコメント入力内容を更新します。
   * @param {string} credentialId - 対象のデバイスID
   * @param {string} value - 入力された文字列
   */
  function onChangeComment(credentialId: string, value: string) {
    setCommentDrafts((prev) => ({ ...prev, [credentialId]: value }));
  }

  /**
   * 選択したデバイスのコメントを保存します。
   * @param {string} credentialId - 更新対象のデバイスID
   */
  async function onSaveComment(credentialId: string) {
    setSavingId(credentialId);
    setError(null);
    try {
      const comment = normalizeCommentInput(commentDrafts[credentialId] ?? "");
      await updateDeviceComment(credentialId, comment);
      // 保存成功時、ローカル状態のデバイス一覧を更新
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
      const errorMessage = getErrorMessage(e, "コメントの更新に失敗しました");
      setError(errorMessage);
    } finally {
      setSavingId(null);
    }
  }

  /**
   * 指定されたデバイスを削除します。
   * @param {string} credentialId - 削除対象のデバイスID
   */
  async function onDeleteDevice(credentialId: string) {
    const confirmed = window.confirm("このデバイスを削除します。よろしいですか？");
    if (!confirmed) {
      return;
    }

    setDeletingId(credentialId);
    setError(null);
    try {
      await deleteDeviceCredential(credentialId);
      // 削除成功時、ローカルの状態から該当アイテムを除外
      setDevices((prev) => prev.filter((row) => row.credential_id !== credentialId));
      setCommentDrafts((prev) => {
        const entries = Object.entries(prev);
        return Object.fromEntries(
          entries.filter(([key]) => key !== credentialId)
        );
      });
    } catch (e) {
      const errorMessage = getErrorMessage(e, "デバイスの削除に失敗しました。");
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  }

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
      const generated = await qrcode.toDataURL(link.url, {
        width: 220,
        margin: 2,
      });
      setQrDataUrl(generated);
    } catch (e) {
      const errorMessage = getErrorMessage(e, "追加デバイス登録リンクの発行に失敗しました");
      setError(errorMessage);
      setQrDataUrl(null);
    } finally {
      setLinkLoading(false);
    }
  }

  /**
   * 発行された登録用URLをクリップボードにコピーします。
   */
  async function onCopyRegistrationLink() {
    if (!registrationLink?.url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(registrationLink.url);
      window.alert("登録リンクをコピーしました。");
    } catch (e) {
      const errorMessage = getErrorMessage(e, "リンクのコピーに失敗しました");
      setError(errorMessage);
    }
  }

  // 少なくとも1つのデバイスが存在するか判定
  const hasDevices = useMemo(() => devices.length > 0, [devices]);

  return (
    <main style={{ padding: 24 }}>
      {/* Launcherへのナビゲーション */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard" style={{ color: "#0070f3", textDecoration: "underline" }}>
          ← 🏠Launcherに戻る
        </Link>
      </div>
      <h1>デバイス管理</h1>
      <p style={{ marginBottom: 16 }}>
        ログイン中ユーザーのWebAuthnデバイス一覧です。コメント編集と削除が行えます。
      </p>

      {/* 新規デバイス登録セクション */}
      <section
        style={{
          marginBottom: 24,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h2 style={{ marginBottom: 8 }}>新しいデバイスを追加</h2>
        <p style={{ marginBottom: 8 }}>5分間有効のワンタイムリンクを発行し、別デバイスで開いて登録します。</p>
        <button type="button" onClick={onCreateRegistrationLink} disabled={linkLoading}>
          {linkLoading ? "発行中..." : "追加デバイス登録リンクを発行"}
        </button>

        {/* リンク発行成功後の表示エリア */}
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
            {/* QRコード表示 */}
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
                <Image src={qrDataUrl} alt="追加デバイス登録用QRコード" width={220} height={220} />
              </div>
            )}
          </div>
        )}
      </section>

      {/* エラーメッセージの表示 */}
      {error && <p style={{ color: "#b00020", marginBottom: 12 }}>{error}</p>}

      {/* データ読み込み中および一覧表示の条件分岐 */}
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