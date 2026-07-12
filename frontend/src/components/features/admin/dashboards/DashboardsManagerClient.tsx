/**
 * @file frontend/src/components/features/admin/dashboards/DashboardsManagerClient.tsx
 * @description 管理者用ダッシュボードリンク管理のClient Component
 */
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { STATUS_MESSAGE_DURATION_MS } from "@/components/common/common_utils";
import {
  createDashboardLinkForm,
  type DashboardLink,
  deleteDashboardLink,
  updateDashboardLinkForm,
} from "@/lib/api/dashboards";
import { getErrorMessage } from "@/lib/error";

/**
 * 編集フォーム/作成フォームで共通利用する入力データ型
 */
type DashboardLinkFormData = {
  title: string;
  url: string;
  icon_path: string;
  file: File | null;
};

/**
 * 操作結果のステータスメッセージ型
 */
type StatusMessage = {
  text: string;
  type: "success" | "error";
};

/**
 * コンポーネントの入力プロパティ
 */
type DashboardsManagerClientProps = {
  initialLinks: DashboardLink[];
  initialErrorMessage?: string | null;
};

/**
 * 管理者向けダッシュボードリンク管理UI
 * @param props 初期データと初期エラーメッセージ
 * @returns 管理画面UI
 */
export default function DashboardsManagerClient({
  initialLinks,
  initialErrorMessage = null,
}: DashboardsManagerClientProps) {
  const router = useRouter();

  const [links, setLinks] = useState<DashboardLink[]>(initialLinks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<DashboardLinkFormData>({
    title: "",
    url: "",
    icon_path: "",
    file: null,
  });
  const [newLinkFormData, setNewLinkFormData] = useState<DashboardLinkFormData>({
    title: "",
    url: "",
    icon_path: "",
    file: null,
  });
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    initialErrorMessage
      ? { text: initialErrorMessage, type: "error" }
      : null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * メッセージタイマーを安全にクリアする。
   */
  const clearStatusTimer = () => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  };

  /**
   * 成功/失敗メッセージを表示し、指定時間後に消去する。
   * @param message 表示文言
   * @param type メッセージ種別
   * @param timeoutMs 自動消去までの時間
   */
  const showStatusMessage = (
    message: string,
    type: StatusMessage["type"],
    timeoutMs = STATUS_MESSAGE_DURATION_MS,
  ) => {
    setStatusMessage({ text: message, type });
    clearStatusTimer();
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
      statusTimerRef.current = null;
    }, timeoutMs);
  };

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, []);

  /**
   * 既存リンクを更新する。
   * @param id 更新対象のリンクID
   */
  const handleUpdate = async (id: string) => {
    if (!editFormData.title || !editFormData.url) {
      showStatusMessage("タイトルとURLは必須項目です", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("title", editFormData.title);
      formData.append("url", editFormData.url);
      if (editFormData.file) {
        formData.append("file", editFormData.file);
      }

      const updatedLink = await updateDashboardLinkForm(id, formData);
      setLinks((prev) => prev.map((link) => (link.id === id ? updatedLink : link)));
      setEditingId(null);
      showStatusMessage("更新に成功しました", "success");
      router.refresh();
    } catch (error) {
      const errorMessage = getErrorMessage(error, "リンク更新に失敗しました");
      showStatusMessage(errorMessage, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 新規リンクを作成する。
   */
  const handleCreate = async () => {
    if (!newLinkFormData.title || !newLinkFormData.url) {
      showStatusMessage("タイトルとURLは必須項目です", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("title", newLinkFormData.title);
      formData.append("url", newLinkFormData.url);
      if (newLinkFormData.file) {
        formData.append("file", newLinkFormData.file);
      }

      const newLink = await createDashboardLinkForm(formData);
      setLinks((prev) => [...prev, newLink]);
      setNewLinkFormData({ title: "", url: "", icon_path: "", file: null });
      showStatusMessage("新規登録に成功しました", "success");
      router.refresh();
    } catch (error) {
      const errorMessage = getErrorMessage(error, "リンク登録に失敗しました");
      showStatusMessage(errorMessage, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 指定リンクを削除する。
   * @param id 削除対象のリンクID
   */
  const handleDelete = async (id: string) => {
    if (!confirm("本当にこのリンクを削除しますか？")) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteDashboardLink(id);
      setLinks((prev) => prev.filter((link) => link.id !== id));
      showStatusMessage("削除に成功しました", "success");
      router.refresh();
    } catch (error) {
      const errorMessage = getErrorMessage(error, "リンク削除に失敗しました");
      showStatusMessage(errorMessage, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ダッシュボードリンクの管理</h1>

      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded ${statusMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">新規リンクの追加</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="タイトル"
            className="border p-2 rounded"
            value={newLinkFormData.title}
            onChange={(e) =>
              setNewLinkFormData({ ...newLinkFormData, title: e.target.value })
            }
          />
          <input
            placeholder="URL"
            className="border p-2 rounded"
            value={newLinkFormData.url}
            onChange={(e) =>
              setNewLinkFormData({ ...newLinkFormData, url: e.target.value })
            }
          />
          <input
            type="file"
            accept="image/*"
            className="border p-2 rounded"
            onChange={(e) =>
              setNewLinkFormData({
                ...newLinkFormData,
                file: e.target.files?.[0] ?? null,
              })
            }
          />
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-70"
            disabled={isProcessing}
          >
            追加する
          </button>
        </div>
      </div>

      <div className="overflow-hidden border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アイコン
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイトル
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {links.map((link) => (
              <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  {link.icon_path ? (
                    <Image
                      src={link.icon_path}
                      alt={link.title}
                      width={32}
                      height={32}
                      className="rounded"
                      unoptimized
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded" />
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === link.id ? (
                    <input
                      className="border border-blue-300 rounded px-2 py-1 w-full"
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, title: e.target.value })
                      }
                    />
                  ) : (
                    <span className="font-medium">{link.title}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === link.id ? (
                    <div className="space-y-2">
                      <input
                        className="border border-blue-300 rounded px-2 py-1 w-full"
                        value={editFormData.url}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, url: e.target.value })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="border border-blue-300 rounded px-2 py-1 w-full"
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            file: e.target.files?.[0] ?? null,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <span className="text-gray-600">{link.url}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-3">
                    {editingId === link.id ? (
                      <button
                        onClick={() => handleUpdate(link.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-70"
                        disabled={isProcessing}
                      >
                        確定
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(link.id);
                            setEditFormData({
                              title: link.title,
                              url: link.url,
                              icon_path: link.icon_path || "",
                              file: null,
                            });
                          }}
                          className="text-blue-600 hover:underline"
                          disabled={isProcessing}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="text-red-600 hover:underline disabled:opacity-70"
                          disabled={isProcessing}
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  登録済みのリンクはありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        ※ 更新後、ページをリロードすることなく即座に反映されます。
      </p>
    </div>
  );
}