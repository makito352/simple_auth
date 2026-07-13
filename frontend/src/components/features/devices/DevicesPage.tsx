/**
 * @file DevicesPage.tsx
 * @description デバイス管理画面のメインコンポーネント。
 * 登録済みWebAuthnデバイスの一覧表示、コメントの編集、削除、および新規デバイス登録用のリンク発行機能を提供します。
 */
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { resolveRegisterErrorMessage } from "@/components/common/common_utils";
import { LoadingSpinner } from "@/components/common/loading-spinner";

import { DeviceRow } from "./renderDeviceRows";
import { useDeviceActions } from "./useDeviceActions";
import { useDevicesList } from "./useDevicesList";
import { useRegistrationLink } from "./useRegistrationLink";

/**
 * ISO形式の日付文字列を、ユーザーのロケールに合わせた読みやすい形式に変換します。
 * 
 * @param iso - ISO 8601形式の文字列
 * @returns フォーマットされた日付文字列（無効な場合は "-"）
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP");
}

/**
 * デバイス管理ページコンポーネント。
 * 
 * このコンポーネントは以下の機能を持ちます：
 * - 登録済みデバイスの一覧表示
 * - デバイスに対するコメントの編集・保存機能
 * - デバイスの削除機能
 * - 新規デバイス登録用のワンタイムリンク（QRコード含む）の発行
 * 
 * @returns デバイス管理画面のJSX
 */
export default function DevicesPage() {
  // 各種フックから状態を取得
  const [devices, loading, error] = useDevicesList();
  const { savingId, deletingId, onSaveAction, onDeleteAction } = useDeviceActions();
  const { linkLoading, registrationLink, qrDataUrl, copied, error: linkError, onCopyRegistrationLink, onCreateRegistrationLink } = useRegistrationLink();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  /**
   * 表示用のコメント一覧。
   * 「サーバーから取得した値」と「ユーザーが入力中の値」をマージして算出する。
   */
  const displayComments = useMemo(() => {
    return devices.reduce((acc, device) => {
      acc[device.credential_id] = inputValues[device.credential_id] ?? device.user_comment ?? "";
      return acc;
    }, {} as Record<string, string>);
  }, [devices, inputValues]);

  /**
   * コメント入力欄の変更をハンドリングし、ローカルの状態を更新します。
   * 
   * @param id - デバイスのcredential_id
   * @param value - 入力された新しいコメント文字列
   */
  const handleCommentChange = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  };

  // 有効なデータがあるかチェック
  const hasDevices = devices.length > 0;

  // データ取得中はローディング表示
  if (loading) return <LoadingSpinner />;

  return (
    <main className="p-6 max-w-7xl mx-auto">
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
            {qrDataUrl && (
              <div className="w-[220px] h-[220px] border border-gray-300 p-2 bg-white flex items-center justify-center mt-2">
                <Image src={qrDataUrl} alt="追加デバイス登録用QRコード" width={220} height={220} />
              </div>
            )}
          </div>
        )}
      </section>

      {error && (
        <p className="text-red-600 mb-3">
          {resolveRegisterErrorMessage(error, "デバイス操作に失敗しました。", "エラーが発生しました。")}
        </p>
      )}
      {linkError && (
        <p className="text-red-600 mb-3">
          {resolveRegisterErrorMessage(linkError, "リンクの発行に失敗しました。", "エラーが発生しました。")}
        </p>
      )}

       {!hasDevices ? (
        <p>登録済みデバイスはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">OS</th>
                <th className="border border-gray-300 p-2 text-left">登録日</th>
                <th className="border border-gray-300 p-2 text-left">コメント</th>
                <th className="border border-gray-300 p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <DeviceRow
                  key={device.credential_id}
                  device={device}
                  savingId={savingId}
                  deletingId={deletingId}
                  commentDrafts={displayComments}
                  onCommentChange={handleCommentChange}
                  onSaveAction={(id) => onSaveAction(id, displayComments[id] || "")}
                  onDeleteAction={onDeleteAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}