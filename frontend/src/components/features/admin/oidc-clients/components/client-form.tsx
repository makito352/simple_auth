/**
 * @file frontend/src/components/features/admin/oidc-clients/components/client-form.tsxx
 * @description OIDCクライアントの作成および編集を行うためのフォームコンポーネント。
 */

import { Save } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { copyToClipboard } from "@/components/common/common_utils";
import { createOidcClient, updateOidcClient } from "@/lib/api/oidc";
import { getErrorMessage } from "@/lib/error";
import type { OidcScope } from "@/types"; 
import { OidcClientInput } from "@/types";

/**
 * OIDCクライアント情報の入力フォーム
 * 
 * @param {Object} props - プロパティ
 * @param {OidcClientInput} props.initialData - 初期データ（編集時は既存のクライアント情報）
 * @param {OidcScope[]} props.scopes - 利用可能なスコープのリスト
 * @param {Function} props.onSuccess - 保存成功時またはキャンセル時に実行されるコールバック
 */
export const ClientForm = ({ 
  initialData, 
  scopes,
  onSuccess 
}: { 
  initialData: OidcClientInput; 
  scopes: OidcScope[];
  onSuccess: () => void 
}) => {
  const [formData, setFormData] = useState<OidcClientInput>(initialData);
  // リダイレクトURIを改行区切りのテキストとして管理
  const [redirectUrisText, setRedirectUrisText] = useState(initialData.allowed_redirect_uris.join("\n"));
  // client_idが存在するかで編集モードか新規作成モードかを判定
  const isEditMode = initialData.client_id !== "";

  /**
   * 改行区切りのテキストからリダイレクトURIの配列を抽出する
   * @param {string} text - 入力されたテキスト
   * @returns {string[]} クリーニング済みのURI配列
   */
  const parseRedirectUris = (text: string): string[] =>
    text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  /**
   * スコープの選択状態を切り替える
   * @param {string} scopeName - 対象のスコープ名
   */
  const handleToggleScope = (scopeName: string) => {
    setFormData((prev) => ({
      ...prev,
      scope_names: prev.scope_names.includes(scopeName)
        ? prev.scope_names.filter((s) => s !== scopeName)
        : [...prev.scope_names, scopeName],
    }));
  };

  /**
   * フォームの送信処理
   * @param {React.FormEvent} e - フォームイベント
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUris = parseRedirectUris(redirectUrisText);

    // バリデーションチェック
    if (normalizedUris.length === 0) return toast.error("リダイレクトURIを1件以上入力してください");
    if (formData.scope_names.length === 0) return toast.error("スコープを1件以上選択してください");

    try {
      if (!isEditMode) {
        // 新規作成処理
        const result = await createOidcClient({ ...formData, allowed_redirect_uris: normalizedUris });
        // 作成成功時、シークレットをクリップボードにコピー
        await copyToClipboard(result.client_secret, "作成成功。クリップボードにコピーしました"); 
      } else {
        // 更新処理
        await updateOidcClient(formData.client_id, {
          ...formData,
          allowed_redirect_uris: normalizedUris,
        });
        toast.success("更新成功");
      }
      onSuccess();
    } catch (err) {
      // エラーメッセージを取得してトースト通知
      toast.error(getErrorMessage(err, "保存に失敗しました"));
    }
  };

  return (
    <div className="bg-white p-6 border rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4 border-b pb-2">
        {isEditMode ? "OIDCクライアント編集" : "新規OIDCクライアント作成"}
      </h2>
      {/* 注意事項の表示 */}
      <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {isEditMode 
          ? "シークレットの再取得はできません。必要なら一覧で再発行してください。" 
          : "作成時に通知されるシークレットは、このタイミングのみ取得可能です。"}
      </div>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
        {/* アプリ名の入力 */}
        <div>
          <label className="block text-sm mb-1">アプリ名</label>
          <input
            className="border p-2 w-full rounded"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        {/* Client IDの入力（編集モードでは変更不可） */}
        <div>
          <label className="block text-sm mb-1">client_id</label>
          <input
            className="border p-2 w-full rounded"
            value={formData.client_id}
            disabled={isEditMode}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            required
          />
        </div>
        {/* 説明文の入力 */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">説明</label>
          <input
            className="border p-2 w-full rounded"
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        {/* リダイレクトURIの入力 */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">リダイレクトURI（1行に1件）</label>
          <textarea
            className="border p-2 w-full rounded min-h-32"
            value={redirectUrisText}
            onChange={(e) => setRedirectUrisText(e.target.value)}
          />
        </div>
        {/* スコープの選択 */}
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
        {/* 操作ボタン */}
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            <Save size={18} /> 保存
          </button>
          <button type="button" className="px-4 py-2 rounded border hover:bg-gray-100" onClick={onSuccess}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
};