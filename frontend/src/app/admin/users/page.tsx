/**
 * @file frontend/src/app/admin/users/page.tsx
 * @description ユーザー管理ページのコンポーネント。ユーザーの一覧表示、作成、編集、削除を行う。
 */
"use client";

import { useEffect,useState } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  createRegistrationLinkForAdmin,
  createReregistrationLinkForAdmin,
  getOneTimeLinkByUserIdForAdmin,
} from "@/lib/api/one_time_link";
import { 
  createUser, 
  deleteUser, 
  fetchUserList,
  updateUser} from "@/lib/api/users";
import { getErrorMessage } from "@/lib/error";
import type {
  LinkType,
  OneTimeLinkCreateResponse,
  OneTimeLinkGetResponse,
  UserProfile,
} from "@/types";

/**
 * ユーザーの状態値の型定義
 */
type UserStatusValue = "pending" | "verified";

/**
 * ワンタイムリンクの表示用型定義
 */
type DisplayOneTimeLink = OneTimeLinkCreateResponse & {
  link_type: LinkType;
};

/**
 * ユーザーの現在のステータスに基づく表示ラベルの定義
 * @type {Record<UserStatusValue, string>}
 */
const STATUS_LABELS: Record<UserStatusValue, string> = {
  pending: "パスキー登録待ち",
  verified: "パスキー登録済み",
};

/**
 * 役割の表示用ラベル
 */
const ROLE_LABELS: Record<"user" | "admin", string> = {
  user: "一般ユーザー",
  admin: "管理者",
};

/**
 * APIレスポンスの型定義を拡張した、管理画面用リンク情報の取得関数（キャスト済み）
 */
const getOneTimeLinkByUserIdForAdminTyped: (
  userId: string,
  linkType: LinkType,
) => Promise<OneTimeLinkGetResponse | null> = getOneTimeLinkByUserIdForAdmin as unknown as (
  userId: string,
  linkType: LinkType,
) => Promise<OneTimeLinkGetResponse | null>;

/**
 * ユーザー向け登録用ワンタイムリンクを生成する関数（キャスト済み）
 */
const createRegistrationLinkForAdminTyped: (
  userId: string,
) => Promise<OneTimeLinkCreateResponse> = createRegistrationLinkForAdmin as unknown as (
  userId: string,
) => Promise<OneTimeLinkCreateResponse>;

/**
 * ユーザー向け機器追加用ワンタイムリンクを生成する関数（キャスト済み）
 */
const createReregistrationLinkForAdminTyped: (
  userId: string,
) => Promise<OneTimeLinkCreateResponse> = createReregistrationLinkForAdmin as unknown as (
  userId: string,
) => Promise<OneTimeLinkCreateResponse>;

/**
 * 日時文字列を日本向け形式へ整形する。
 * @param iso - ISO 8601形式の日時文字列
 * @returns 整形済み文字列。変換失敗時は"-"を返す。
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ja-JP");
}

/**
 * APIレスポンスの状態値を画面表示用に正規化する。
 * @param user - 生のユーザー情報
 * @returns 正規化済みユーザー情報
 */
function normalizeUser(user: UserProfile): UserProfile {
  if (typeof user.status === "string" && user.status.length > 0) {
    return user;
  }
  if (typeof user.email_verification_status === "string") {
    return {
      ...user,
      status: user.email_verification_status,
    };
  }
  return {
    ...user,
    status: "pending",
  };
}

/**
 * 状態値を表示文言へ変換する。
 * @param status - ユーザー状態
 * @returns 画面表示用文言
 */
function getStatusLabel(status: string): string {
  if (status === "pending") {
    return STATUS_LABELS.pending;
  }
  if (status === "verified") {
    return STATUS_LABELS.verified;
  }
  return `不明な状態 (${status})`;
}

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
  const [rowLoadingByUserId, setRowLoadingByUserId] = useState<Record<string, boolean>>({});
  const [linkByUserId, setLinkByUserId] = useState<Record<string, DisplayOneTimeLink>>({});
  const [linkUsageByUserId, setLinkUsageByUserId] = useState<Record<string, string>>({});
  
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
        setUsers(data.map(normalizeUser));
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
      setUsers(prev => [...prev, normalizeUser(newUser)]); 
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

  /**
   * 対象ユーザー行のローディング状態を更新する。
   * @param userId - 対象ユーザーID
   * @param loadingValue - 設定するローディング状態
   */
  const setRowLoading = (userId: string, loadingValue: boolean) => {
    setRowLoadingByUserId((prev) => ({
      ...prev,
      [userId]: loadingValue,
    }));
  };

  /**
   * pendingユーザー向けに登録リンクを取得し、未発行なら作成して表示する。
   * @param userId - 対象ユーザーID
   */
  const handleFetchOrCreatePendingLink = async (userId: string) => {
    setRowLoading(userId, true);
    try {
      const existing: OneTimeLinkGetResponse | null = await getOneTimeLinkByUserIdForAdminTyped(userId, "registration");
      if (existing !== null) {
        setLinkByUserId((prev) => ({
          ...prev,
          [userId]: {
            ...existing,
            link_type: "registration",
          },
        }));
        setLinkUsageByUserId((prev) => ({
          ...prev,
          [userId]: "未使用リンクあり",
        }));
        setStatusMessage({ text: "取得済みの登録リンクを表示しました", type: "success" });
        setTimeout(() => setStatusMessage(null), messageTimeout);
        return;
      }

      const created: OneTimeLinkCreateResponse = await createRegistrationLinkForAdminTyped(userId);
      setLinkByUserId((prev) => ({
        ...prev,
        [userId]: {
          ...created,
          link_type: "registration",
        },
      }));
      setLinkUsageByUserId((prev) => ({
        ...prev,
        [userId]: "未使用リンクあり",
      }));
      setStatusMessage({ text: "登録用ワンタイムリンクを発行しました", type: "success" });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "登録用ワンタイムリンクの取得/発行に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    } finally {
      setRowLoading(userId, false);
      setTimeout(() => setStatusMessage(null), messageTimeout);
    }
  };

  /**
   * verifiedユーザー向けに機器追加用リンクを発行する。
   * @param userId - 対象ユーザーID
   */
  const handleCreateReregLink = async (userId: string) => {
    setRowLoading(userId, true);
    try {
      const created: OneTimeLinkCreateResponse = await createReregistrationLinkForAdminTyped(userId);
      setLinkByUserId((prev) => ({
        ...prev,
        [userId]: {
          ...created,
          link_type: "device_registration",
        },
      }));
      setLinkUsageByUserId((prev) => ({
        ...prev,
        [userId]: "未使用リンクあり",
      }));
      setStatusMessage({ text: "機器追加用ワンタイムリンクを発行しました", type: "success" });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "機器追加用ワンタイムリンクの発行に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    } finally {
      setRowLoading(userId, false);
      setTimeout(() => setStatusMessage(null), messageTimeout);
    }
  };

  /**
   * verifiedユーザー向けに機器追加リンクの未使用有効状態を確認する。
   * @param userId - 対象ユーザーID
   */
  const handleCheckVerifiedUsage = async (userId: string) => {
    setRowLoading(userId, true);
    try {
      const existing: OneTimeLinkGetResponse | null = await getOneTimeLinkByUserIdForAdminTyped(userId, "device_registration");
      if (existing === null) {
        setLinkUsageByUserId((prev) => ({
          ...prev,
          [userId]: "未使用リンクなし（未発行・使用済み・期限切れ）",
        }));
        setStatusMessage({ text: "未使用リンクは見つかりませんでした", type: "success" });
      } else {
        setLinkByUserId((prev) => ({
          ...prev,
          [userId]: {
            ...existing,
            link_type: "device_registration",
          },
        }));
        setLinkUsageByUserId((prev) => ({
          ...prev,
          [userId]: "未使用リンクあり",
        }));
        setStatusMessage({ text: "機器追加用リンクの使用状況を更新しました", type: "success" });
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, "機器追加用リンクの使用状況確認に失敗しました");
      setStatusMessage({ text: errorMessage, type: "error" });
    } finally {
      setRowLoading(userId, false);
      setTimeout(() => setStatusMessage(null), messageTimeout);
    }
  };

  // ロード中の表示処理
  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-full mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ユーザー・権限管理</h1>

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
              <option value="user">{ROLE_LABELS.user}</option>
              <option value="admin">{ROLE_LABELS.admin}</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">追加</button>
        </form>
      </div>

      {/* ユーザー一覧テーブル */}
      <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="divide-x divide-gray-200">
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">メールアドレス</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">権限</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">状態</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[250px]">リンク操作・詳細</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
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
                       <option value="user">{ROLE_LABELS.user}</option>
                       <option value="admin">{ROLE_LABELS.admin}</option>
                     </select>
                   ) : (
                     <span className={`font-medium ${user.role === 'admin' ? 'text-red-600' : ''}`}>
                       {ROLE_LABELS[user.role as "user" | "admin"]}
                     </span>
                   )}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${
                    user.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {getStatusLabel(user.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-left">
                  <div className="space-y-2 min-w-[280px]">
                    {user.status === "pending" && (
                      <button
                        onClick={() => handleFetchOrCreatePendingLink(user.id)}
                        disabled={rowLoadingByUserId[user.id] === true}
                        className="text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                      >
                        {rowLoadingByUserId[user.id] ? "処理中..." : "登録リンクを取得/発行"}
                      </button>
                    )}
                    {user.status === "verified" && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleCreateReregLink(user.id)}
                          disabled={rowLoadingByUserId[user.id] === true}
                          className="text-indigo-600 hover:underline text-left disabled:text-gray-400 disabled:no-underline"
                        >
                          {rowLoadingByUserId[user.id] ? "処理中..." : "機器追加リンクを発行"}
                        </button>
                        <button
                          onClick={() => handleCheckVerifiedUsage(user.id)}
                          disabled={rowLoadingByUserId[user.id] === true}
                          className="text-teal-600 hover:underline text-left disabled:text-gray-400 disabled:no-underline"
                        >
                          使用状況をチェック
                        </button>
                      </div>
                    )}

                    {linkUsageByUserId[user.id] && (
                      <p className="text-xs text-gray-700">{linkUsageByUserId[user.id]}</p>
                    )}

                      {linkByUserId[user.id] && (
                        <div className="rounded border border-gray-200 bg-gray-50 p-2 text-[10px] space-y-0">
                          <div className="flex gap-2 mb-1">
                            <span className="text-gray-500 min-w-[40px]">種別:</span>
                            <span>{linkByUserId[user.id].link_type === "registration" ? "登録用" : "機器追加用"}</span>
                          </div>
                          <div className="flex gap-2 mb-1">
                            <span className="text-gray-500 min-w-[40px]">期限:</span>
                            <span>{formatDate(linkByUserId[user.id].expires_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 min-w-[40px]">URL:</span>
                            <input
                              type="text"
                              readOnly
                              value={linkByUserId[user.id].url}
                              className="w-full border rounded px-1 py-0.5 bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap"> 
                  <div className="flex justify-center space-x-4">
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
