
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { resolveRegisterErrorMessage } from "@/components/common/register_shared";

import { DeviceRow } from "./renderDeviceRows";
import { useDeviceActions } from "./useDeviceActions";
import { useDevicesList } from "./useDevicesList";
import { useRegistrationLink } from "./useRegistrationLink";

/**
 * 日付フォーマットなどのユーティリティは、必要であれば別ファイルに切り出します。
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP");
}

export default function DevicesPage() {
  // 各種フックから状態を取得
  const [devices, loading, error] = useDevicesList();
  const { savingId, deletingId, onSaveAction, onDeleteAction } = useDeviceActions();
  const { linkLoading, registrationLink, qrDataUrl, copied, error: linkError, onCopyRegistrationLink, onCreateRegistrationLink } = useRegistrationLink();

  // 内部状態（入力中のドラフト）を管理
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  /**
   * 入力内容の更新をハンドリング（useDeviceActionsと連携）
   */
  const handleCommentChange = (id: string, value: string) => {
    setCommentDrafts((prev) => ({ ...prev, [id]: value }));
  };

  // 有効なデータがあるかチェック
  const hasDevices = devices.length > 0;

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
                  key={device.credential_id} // IDをキーにする
                  device={device}
                  savingId={savingId}
                  deletingId={deletingId}
                  commentDrafts={commentDrafts}
                  onCommentChange={handleCommentChange}
                  onSaveAction={onSaveAction}
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