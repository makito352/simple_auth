/**
 * @file ダッシュボードリンク管理ページ
 * 
 * このコンポーネントは、管理者用ダッシュボードに表示される各種リンク（タイトル、URL、アイコン）を
 * 追加、更新、削除するためのインターフェースを提供します。
 */
"use client";

import { useState, useEffect } from "react";
import { 
  fetchDashboardLinks, 
  type DashboardLink, 
  createDashboardLinkForm,
  updateDashboardLinkForm, 
  deleteDashboardLink 
} from "@/lib/api/dashboards";
import { getErrorMessage } from "@/lib/error";
import Image from "next/image";

/**
 * ダッシュボードリンクの管理ページコンポーネント
 * 
 * @returns 管理用ダッシュボードページのUI
 */
export default function DashboardsPage() {
  // --- ステート定義 ---
  const [links, setLinks] = useState<DashboardLink[]>([]); // 全てのダッシュボードリンク
  const [loading, setLoading] = useState(true); // 初期データの読み込み中フラグ
  const [editingId, setEditingId] = useState<string | null>(null); // 現在編集中の項目のID（nullの場合は通常表示）
  const [editFormData, setEditFormData] = useState({ title: "", url: "", icon_path: "", file: null as File | null }); // 編集用フォームデータ

  // 追加用フォームの状態（新規作成時にも利用）
  const [newLinkFormData, setNewLinkFormData] = useState({ title: "", url: "", icon_path: "", file: null as File | null });

  // 操作結果の通知（成功/失敗メッセージ）
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  /**
   * 初期データの読み込み
   * コンポーネントのマウント時に実行されます。
   */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchDashboardLinks();
      setLinks(data);
      setLoading(false);
    }
    loadData();
  }, []);

  /**
   * 既存リンクの更新処理
   * @param id 更新する対象のID
   */
  const handleUpdate = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append("title", editFormData.title);
      formData.append("url", editFormData.url);
      if (editFormData.file) {
        formData.append("file", editFormData.file);
      }

      const updatedLink = await updateDashboardLinkForm(id, formData);
      // 状態を更新し、現在の選択を解除
      setLinks(prev => prev.map(link => link.id === id ? updatedLink : link));
      setEditingId(null);
      setStatusMessage({ text: "更新に成功しました", type: "success" });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "リンク更新に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    }

    // 3秒後に通知メッセージを消去
    setTimeout(() => setStatusMessage(null), 3000);
  };

  /**
   * 新規リンクの登録処理
   */
  const handleCreate = async () => {
    // バリデーション（必須チェック）
    if (!newLinkFormData.title || !newLinkFormData.url) {
      setStatusMessage({ text: "タイトルとURLは必須項目です", type: "error" });
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", newLinkFormData.title);
      formData.append("url", newLinkFormData.url);
      if (newLinkFormData.file) {
        formData.append("file", newLinkFormData.file);
      }

      const newLink = await createDashboardLinkForm(formData);
      setLinks(prev => [...prev, newLink]);
      // フォームをリセット
      setNewLinkFormData({ title: "", url: "", icon_path: "", file: null });
      setStatusMessage({ text: "新規登録に成功しました", type: "success" });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "リンク登録に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  /**
   * リンクの削除処理
   * @param id 削除対象のID
   */
  const handleDelete = async (id: string) => {
    if (!confirm("本当にこのリンクを削除しますか？")) return;
    try {
      await deleteDashboardLink(id);
      // リストから該当要素を除外
      setLinks(prev => prev.filter(link => link.id !== id));
      setStatusMessage({ text: "削除に成功しました", type: "success" });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "リンク削除に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    }

    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ローディング中の表示
  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ダッシュボードリンクの管理</h1>

      {/* 成功・失敗の通知メッセージ表示 */}
      {statusMessage && (
        <div className={`mb-4 p-3 rounded ${statusMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {statusMessage.text}
        </div>
      )}
      
      {/* 新規追加用フォームのセクション */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">新規リンクの追加</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="タイトル"
            className="border p-2 rounded"
            value={newLinkFormData.title}
            onChange={(e) => setNewLinkFormData({ ...newLinkFormData, title: e.target.value })}
          />
          <input
            placeholder="URL"
            className="border p-2 rounded"
            value={newLinkFormData.url}
            onChange={(e) => setNewLinkFormData({ ...newLinkFormData, url: e.target.value })}
          />
          {/* 画像ファイルを選択 */}
          <input
            type="file"
            accept="image/*"
            className="border p-2 rounded"
            onChange={(e) => setNewLinkFormData({ ...newLinkFormData, file: e.target.files?.[0] ?? null })}
          />
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            追加する
          </button>
        </div>
      </div>

      {/* 既存リンク一覧のテーブル */}
      <div className="overflow-hidden border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アイコン</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {links.map((link) => (
              <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  {link.icon_path ? (
                    <Image src={link.icon_path} alt={link.title} width={32} height={32} className="rounded" unoptimized/>
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded" />
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === link.id ? (
                    <input 
                      className="border border-blue-300 rounded px-2 py-1 w-full"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
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
                        onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="border border-blue-300 rounded px-2 py-1 w-full"
                        onChange={(e) => setEditFormData({ ...editFormData, file: e.target.files?.[0] ?? null })}
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
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
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
                              file: null
                            });
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          編集
                        </button>
                        <button 
                          onClick={() => handleDelete(link.id)}
                          className="text-red-600 hover:underline"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 補助説明 */}
      <p className="mt-4 text-sm text-gray-500">
        ※ 更新後、ページをリロードすることなく即座に反映されます。
      </p>
    </div>
  );
}