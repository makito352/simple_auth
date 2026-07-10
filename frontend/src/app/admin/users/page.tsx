/**
 * @file frontend/src/app/admin/users/page.tsx
 * @description ユーザー管理ページのコンポーネント。ユーザーの一覧表示、作成、編集、削除を行う。
 */
"use client";

import { useState, useEffect } from "react";
import { 
  fetchUserList,
  createUser, 
  updateUser, 
  deleteUser 
} from "@/lib/api/users";
import type { UserProfile } from "@/types";
import { getErrorMessage } from "@/lib/error";
import { LoadingSpinner } from "@/app/components/loading-spinner";

/**
 * ユーザー管理メインページコンポーネント
 * @returns ユーザー一覧と操作フォームを含むUIをレンダリングします。
 */
export default function UsersPage() {
  // --- ステート定義 ---
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ email: "", role: "user" as "admin" | "user" });
  
  // ユーザー操作時のフィードバックメッセージ用（成功/失敗）
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // メッセージ表示時間（20秒）
  const messageTimeout = 20000;
  /**
   * 初期データの読み込み
   * コンポーネントのマウント時に実行されます。
   */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchUserList();
        setUsers(data);
      } catch (error) {
        const errorMessage = getErrorMessage(error, "ユーザー一覧の取得に失敗しました");
        setStatusMessage({ text: errorMessage, type: "error" });
      } finally {
        setLoading(false);
      }
    }
    
    loadData(); // 関数を呼び出すように修正
  }, []);

  /**
   * 新規ユーザーの登録処理
   * @param e - フォームの送信イベント
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await createUser(editFormData);
      // 作成成功時、ステートを更新
      setUsers(prev => [...prev, newUser]); 
      setStatusMessage({ text: "ユーザーを作成しました", type: "success" });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "ユーザー作成に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    }
    // 20秒後にメッセージをクリア
    setTimeout(() => setStatusMessage(null), messageTimeout);
  };

  /**
   * ユーザー情報の更新処理
   * @param id - 更新対象のユーザーID
   */
  const handleUpdate = async (id: string) => {
    try {
      await updateUser(id, editFormData);
      // ローカルのステートを更新
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...editFormData } : u));
      setEditingId(null); // 編集モードを終了
      setStatusMessage({ text: "更新しました", type: "success" });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "ユーザー更新に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    }
    // 20秒後にメッセージをクリア
    setTimeout(() => setStatusMessage(null), messageTimeout);
  };

  /**
   * ユーザー削除の処理
   * @param id - 削除対象のユーザーID
   */
  const handleDelete = async (id: string) => {
    if (!confirm("このユーザーを削除してもよろしいですか？")) return;
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setStatusMessage({ text: "削除しました", type: "success" });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "ユーザー削除に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    }
    // 20秒後にメッセージをクリア
    setTimeout(() => setStatusMessage(null), messageTimeout);
  };

  // ロード中の表示処理
  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>

      {/* エラーや成功の通知メッセージ */}
      {statusMessage && (
        <div className={`mb-4 p-3 rounded-md border ${
          statusMessage.type === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {statusMessage.text}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">新規ユーザー登録</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end bg-gray-50 p-4 rounded border">
          <div className="flex flex-col">
            <label className="text-sm">メールアドレス</label>
            <input 
              type="email" 
              required 
              className="border p-2 rounded" 
              onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
              placeholder="user@example.com"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">権限</label>
            <select 
              className="border p-2 rounded"
              value={editFormData.role}
              onChange={(e) => setEditFormData({...editFormData, role: e.target.value as "admin" | "user"})}
            >
              <option value="user">一般ユーザー</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">追加</button>
        </form>
      </div>

      {/* ユーザー一覧テーブル */}
      <div className="overflow-hidden border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="divide-x divide-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">subject id</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メールアドレス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">役割</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                  {user.id}
                </td>
                <td className="px-6 py-4">
                  {/* 編集モードの場合のみインプットを表示 */}
                  {editingId === user.id ? (
                    <input 
                      className="border border-blue-300 rounded px-2 py-1"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    />
                  ) : user.email}
                </td>
                <td className="px-6 py-4">
                   {editingId === user.id ? (
                     <select 
                       className="border border-blue-300 rounded px-2 py-1"
                       value={editFormData.role}
                       onChange={(e) => setEditFormData({...editFormData, role: e.target.value as "admin" | "user"})}
                     >
                       <option value="user">一般ユーザー</option>
                       <option value="admin">管理者</option>
                     </select>
                   ) : (
                     <span className={`font-medium ${user.role === 'admin' ? 'text-red-600' : ''}`}>
                       {user.role}
                     </span>
                   )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-4">
                    {editingId === user.id ? (
                      <>
                        <button 
                          onClick={() => handleUpdate(user.id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded"
                        >
                          更新
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="bg-gray-500 text-white px-3 py-1 rounded"
                        >
                          キャンセル
                        </button>
                      </>
                      ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingId(user.id);
                            setEditFormData({ email: user.email, role: user.role });
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          編集
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
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
    </div>
  );
}