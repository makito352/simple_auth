/**
 * @file page.tsx
 * @description OIDCクライアント管理画面
 * 
 * このページでは、OIDC（OpenID Connect）のクライアント情報の閲覧、新規作成、編集、
 * およびシークレットの再発行を行うことができます。
 * セキュリティの観点から、シークレットの平文は常にマスクされ、コピー機能を通じてのみ取得可能となります。
 */


"use client";
import React, { useEffect, useState } from "react";
import {
  createOidcClient,
  fetchOidcClients,
  fetchOidcScopes,
  rotateOidcClientSecret,
  updateOidcClient,
} from "@/lib/api/oidc";
import type {
  OidcClient,
  OidcClientInput,
  OidcClientUpdateInput,
  OidcScope,
} from "@/types";
import { Edit2, KeyRound, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

/**
 * 編集モードの状態を定義する型
 * @property {mode} 現在の操作が「作成」か「編集」かを識別
 * @property {clientId} 編集時に対象となるクライアントID
 */
type EditingState = {
  mode: "create" | "edit";
  clientId?: string;
};

/**
 * 初期フォームのデフォルト値定義
 */
const INITIAL_FORM: OidcClientInput = {
  name: "",
  client_id: "",
  description: "",
  allowed_redirect_uris: [],
  scope_names: [],
  is_active: true,
};

/**
 * 入力されたリダイレクトURIを正規化し、配列に変換する
 * @param {string} text 改行区切りの文字列
 * @returns {string[]} 重複や空行を除去したURLの配列
 */
function parseRedirectUris(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}


/**
 * OIDCクライアント管理のメインコンポーネント
 */
export default function OidcClientManagementPage() {
  const [clients, setClients] = useState<OidcClient[]>([]);
  const [scopes, setScopes] = useState<OidcScope[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [formData, setFormData] = useState<OidcClientInput>(INITIAL_FORM);
  const [redirectUrisText, setRedirectUrisText] = useState("");

  /**
   * クライアント一覧と利用可能なスコープを初期ロードする
   */
  const loadData = async () => {
    try {
      const [clientsData, scopesData] = await Promise.all([
        fetchOidcClients(),
        fetchOidcScopes(),
      ]);
      setClients(clientsData);
      setScopes(scopesData);
    } catch (error) {
      toast.error("OIDCクライアント情報の取得に失敗しました");
    }
  };

  /**
   * コンポーネントマウント時にデータを取得する
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  /**
   * 「新規作成」ボタンクリック時の処理
   */
  const handleOpenCreate = () => {
    setEditing({ mode: "create" });
    setFormData(INITIAL_FORM);
    setRedirectUrisText("");
  };

  /**
   * 「編集」ボタンクリック時の処理（フォームを既存データで初期化）
   * @param {OidcClient} client 対象のクライアントオブジェクト
   */
  const handleOpenEdit = (client: OidcClient) => {
    setEditing({ mode: "edit", clientId: client.client_id });
    setFormData({
      name: client.name,
      client_id: client.client_id,
      description: client.description || "",
      allowed_redirect_uris: client.allowed_redirect_uris,
      scope_names: client.scope_names,
      is_active: client.is_active,
    });
    setRedirectUrisText(client.allowed_redirect_uris.join("\n"));
  };

  /**
   * スコープの選択状態を切り替える
   * @param {string} scopeName 対象のスコープ名
   */
  const handleToggleScope = (scopeName: string) => {
    setFormData((prev) => {
      const exists = prev.scope_names.includes(scopeName);
      return {
        ...prev,
        scope_names: exists
          ? prev.scope_names.filter((scope) => scope !== scopeName)
          : [...prev.scope_names, scopeName],
      };
    });
  };

  /**
   * フォーム送信処理（新規作成または更新）
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedRedirectUris = parseRedirectUris(redirectUrisText);
    // バリデーションチェック
    if (normalizedRedirectUris.length === 0) {
      toast.error("リダイレクトURIを1件以上入力してください");
      return;
    }

    if (formData.scope_names.length === 0) {
      toast.error("スコープを1件以上選択してください");
      return;
    }

    try {
      if (editing?.mode === "create") {
        // 新規作成処理
        const result = await createOidcClient({
          ...formData,
          allowed_redirect_uris: normalizedRedirectUris,
        });
        toast.success("OIDCクライアントを作成しました。シークレットをコピーします");
        await copyToClipboard(result.client_secret, "create");
      } else if (editing?.mode === "edit" && editing.clientId) {
        // 更新処理
        const payload: OidcClientUpdateInput = {
          name: formData.name,
          description: formData.description,
          allowed_redirect_uris: normalizedRedirectUris,
          scope_names: formData.scope_names,
          is_active: formData.is_active,
        };
        await updateOidcClient(editing.clientId, payload);
        toast.success("OIDCクライアントを更新しました");
      }

      setEditing(null);// フォームを閉じる
      await loadData(); // リストを再読み込み
    } catch (error) {
      toast.error("保存に失敗しました");
    }
  };

  /**
   * クライアントシークレットの再発行処理
   * @param {string} clientId 対象のクライアントID
   */
  const handleRotateSecret = async (clientId: string) => {
    if (!confirm("クライアントシークレットを再発行します。よろしいですか？")) {
      return;
    }

    try {
      const result = await rotateOidcClientSecret(clientId);
      toast.success("シークレットを再発行しました。新しいシークレットをコピーします");
      await copyToClipboard(result.client_secret, "rotate");
      await loadData();
    } catch (error) {
      toast.error("シークレット再発行に失敗しました");
    }
  };

  /**
   * シークレットをクリップボードにコピーする
   * 秘密情報の平文を画面上に保持しないため、表示ではなくコピー通知のみ行う。
   * @param {string} text コピーするテキスト
   * @param {"create" | "rotate"} source コピー元の操作
   */
  const copyToClipboard = async (text: string, source: "create" | "rotate") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("シークレットをクリップボードにコピーしました");
      toast.info(
        source === "create"
          ? "シークレットは保存時のみ取得できます。再取得が必要な場合は再発行してください。"
          : "シークレットを再取得する場合は、再度再発行が必要です。",
      );
    } catch {
      toast.error("クリップボードへのコピーに失敗しました。再取得する場合は再発行してください");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">OIDCクライアント管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            一覧ではclient_secretの平文は表示されません。
            シークレットの取得は保存時または再発行時にクリップボードにコピーされるのみで、再取得する場合は再発行が必要です。
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleOpenCreate}
        >
          <Plus size={18} /> 新規作成
        </button>
      </div>

      {editing && (
        <div className="bg-white p-6 border rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">
            {editing.mode === "create" ? "新規OIDCクライアント作成" : "OIDCクライアント編集"}
          </h2>

          <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {editing.mode === "create"
              ? "作成時に返却されるシークレットはこのタイミングでのみ取得できます。後から再表示はできません。"
              : "シークレットの再取得はできません。必要な場合は一覧の再発行ボタンを使用してください。"}
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm mb-1">アプリ名</label>
              <input
                className="border p-2 w-full rounded"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">client_id</label>
              <input
                className="border p-2 w-full rounded"
                value={formData.client_id}
                disabled={editing.mode === "edit"}
                onChange={(event) => setFormData((prev) => ({ ...prev, client_id: event.target.value }))}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">説明</label>
              <input
                className="border p-2 w-full rounded"
                value={formData.description || ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">リダイレクトURI（1行に1件）</label>
              <textarea
                className="border p-2 w-full rounded min-h-32"
                value={redirectUrisText}
                onChange={(event) => setRedirectUrisText(event.target.value)}
                placeholder="https://example.com/auth/callback"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-2">許可スコープ</label>
              <div className="flex flex-wrap gap-3">
                {scopes.map((scope) => (
                  <label key={scope.scope_name} className="inline-flex items-center gap-2 border rounded px-3 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.scope_names.includes(scope.scope_name)}
                      onChange={() => handleToggleScope(scope.scope_name)}
                    />
                    <span>{scope.scope_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) => setFormData((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                <span>有効にする</span>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                <Save size={18} /> 保存
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded border hover:bg-gray-100"
                onClick={() => setEditing(null)}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border rounded overflow-hidden bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 border-b">アプリ名</th>
              <th className="p-3 border-b">client_id</th>
              <th className="p-3 border-b">
                client_secret
                <div className="text-xs font-normal text-gray-500 mt-1">マスク表示のみ（再表示不可）</div>
              </th>
              <th className="p-3 border-b">scope</th>
              <th className="p-3 border-b">状態</th>
              <th className="p-3 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="p-3 border-b">{client.name}</td>
                <td className="p-3 border-b font-mono text-sm">{client.client_id}</td>
                <td className="p-3 border-b font-mono text-sm">{client.client_secret_masked}</td>
                <td className="p-3 border-b text-sm">{client.scope_names.join(" ")}</td>
                <td className="p-3 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${client.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                    {client.is_active ? "有効" : "無効"}
                  </span>
                </td>
                <td className="p-3 border-b">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-blue-600"
                      onClick={() => handleOpenEdit(client)}
                      title="編集"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="text-amber-600"
                      onClick={() => handleRotateSecret(client.client_id)}
                      title="シークレット再取得が必要な場合は再発行"
                    >
                      <KeyRound size={18} />
                    </button>
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
