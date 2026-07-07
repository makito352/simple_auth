"use client";

import { useState, useEffect } from "react";
import { 
  fetchUserProfile, 
  fetchUserList,
  type UserProfile, 
  createUser, 
  updateUser, 
  deleteUser 
} from "@/lib/api/users";

/**
 * ユーザー管理ページ
 */
export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ email: "", role: "user" as "admin" | "user" });
  
  // ステータスメッセージ用
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 初期データの読み込み（実際にはバックエンドに/users/の一覧取得APIがある想定）
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 修正: fetchUserProfile (個人用) ではなく fetchUserList (一覧用) を使用
        const data = await fetchUserList();
        setUsers(data);
      } catch (error) {
        console.error("Failed to load user list:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData(); // 関数を呼び出すように修正
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(editFormData);
      setUsers(prev => [...prev, { ...editFormData, id: "new-id" } as UserProfile]); // 仮のID
      setStatusMessage({ text: "ユーザーを作成しました", type: "success" });
    } catch (err) {
      setStatusMessage({ text: "作成に失敗しました", type: "error" });
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateUser(id, editFormData);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...editFormData } : u));
      setEditingId(null);
      setStatusMessage({ text: "更新しました", type: "success" });
    } catch (err) {
      setStatusMessage({ text: "更新に失敗しました", type: "error" });
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このユーザーを削除してもよろしいですか？")) return;
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setStatusMessage({ text: "削除しました", type: "success" });
    } catch (err) {
      setStatusMessage({ text: "削除に失敗しました", type: "error" });
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>

      {statusMessage && (
        <div className={`mb-4 p-3 rounded ${statusMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
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

      <div className="overflow-hidden border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                      <button 
                        onClick={() => handleUpdate(user.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                      >
                        更新
                      </button>
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