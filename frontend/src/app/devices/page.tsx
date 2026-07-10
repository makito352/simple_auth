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
  const [copied, setCopied] = useState(false); 
  const COPY_TIMEOUT = 2000; // コピー状態を保持する時間（ミリ秒）

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
      // 成功時に状態を更新
      setCopied(true);
      // 2秒後に元に戻す
      setTimeout(() => setCopied(false), COPY_TIMEOUT);
    } catch (e) {
      const errorMessage = getErrorMessage(e, "リンクのコピーに失敗しました");
      setError(errorMessage);
    }
  }

  // 少なくとも1つのデバイスが存在するか判定
  const hasDevices = useMemo(() => devices.length > 0, [devices]);

  return (
    <main className="p-6 max-w-7xl mx-auto">
      {/* Launcherへのナビゲーション */}
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 underline hover:text-blue-800">
          ← 🏠Launcherに戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">デバイス管理</h1>
      <p className="mb-6 text-gray-600">
        ログイン中ユーザーのWebAuthnデバイス一覧です。コメント編集と削除が行えます。
      </p>

      {/* 新規デバイス登録セクション */}
      <section className="mb-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
        <h2 className="text-lg font-bold mb-1">新しいデバイスを追加</h2>
        <p className="mb-4 text-sm text-gray-600">5分間有効のワンタイムリンクを発行し、別デバイスで開いて登録します。</p>
        <button 
          type="button" 
          onClick={onCreateRegistrationLink} 
          disabled={linkLoading}
          className={`px-4 py-2 rounded font-medium transition ${
            linkLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {linkLoading ? "発行中..." : "追加デバイス登録リンクを発行"}
        </button>

        {/* リンク発行成功後の表示エリア */}
        {registrationLink && (
          <div className="mt-4 grid gap-3">
            <p className="text-sm">有効期限: {formatDate(registrationLink.expires_at)}</p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                readOnly
                value={registrationLink.url}
                className="flex-1 min-w-[280px] p-2 border border-gray-300 rounded bg-white"
              />
            <button 
              type="button" 
              onClick={onCopyRegistrationLink}
              className={`px-4 py-2 rounded hover:bg-green-700 transition ${
                copied ? "bg-green-800" : "bg-green-600"
              }`}
            >
              {copied ? "コピー済み" : "コピー"}
            </button>
            </div>
            <a 
              href={registrationLink.url} 
              target="_blank" 
              rel="noreferrer"
              className="text-blue-600 font-bold hover:underline"
            >
              このリンクを新しいデバイスで開く
            </a>
            {/* QRコード表示 */}
            {qrDataUrl && (
              <div className="w-[220px] h-[220px] border border-gray-300 p-2 bg-white flex items-center justify-center mt-2">
                <Image src={qrDataUrl} alt="追加デバイス登録用QRコード" width={220} height={220} />
              </div>
            )}
          </div>
        )}
      </section>
      
      {/* エラーメッセージの表示 */}
      {error && <p className="text-red-600 mb-3">{error}</p>}

      {/* データ読み込み中および一覧表示の条件分岐 */}
      {loading ? (
        <p>読み込み中...</p>
      ) : !hasDevices ? (
        <p>登録済みデバイスはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">OS</th>
                <th className="border border-gray-300 p-2 text-left">登録日</th>
                <th className="border border-gray-300 p-2 text-left">コメント</th>
                <th className="border border-gray-300 p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {devices?.map((device) => {
                const isSaving = savingId === device.credential_id;
                const isDeleting = deletingId === device.credential_id;
                return (
                  <tr key={device.id}>
                    <td className="border border-gray-300 p-2">{device.device_name ?? "Unknown"}</td>
                    <td className="border border-gray-300 p-2">{formatDate(device.created_at)}</td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="text"
                        value={commentDrafts[device.credential_id] ?? ""}
                        onChange={(e) => onChangeComment(device.credential_id, e.target.value)}
                        maxLength={255}
                        placeholder="例: WindowsメインPC / 会社用スマホ"
                        disabled={isDeleting}
                        className="w-full min-w-[240px] p-2 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveComment(device.credential_id)}
                          disabled={isSaving || isDeleting}
                          className={`px-3 py-1 rounded ${
                            isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isSaving ? "保存中..." : "保存"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDevice(device.credential_id)}
                          disabled={isSaving || isDeleting}
                          className={`px-3 py-1 rounded ${
                            isDeleting ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
                          }`}
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
        </div>
      )}
    </main>
  );
}