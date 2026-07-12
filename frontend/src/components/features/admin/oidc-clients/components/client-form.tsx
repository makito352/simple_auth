import { Save } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { copyToClipboard } from "@/components/common/common_utils";
import { createOidcClient, updateOidcClient } from "@/lib/api/oidc";
import { getErrorMessage } from "@/lib/error";
import type { OidcScope } from "@/types"; 
import { OidcClientInput } from "@/types";

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
  const [redirectUrisText, setRedirectUrisText] = useState(initialData.allowed_redirect_uris.join("\n"));
  const isEditMode = initialData.client_id !== "";

  const parseRedirectUris = (text: string): string[] =>
    text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  const handleToggleScope = (scopeName: string) => {
    setFormData((prev) => ({
      ...prev,
      scope_names: prev.scope_names.includes(scopeName)
        ? prev.scope_names.filter((s) => s !== scopeName)
        : [...prev.scope_names, scopeName],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUris = parseRedirectUris(redirectUrisText);

    if (normalizedUris.length === 0) return toast.error("リダイレクトURIを1件以上入力してください");
    if (formData.scope_names.length === 0) return toast.error("スコープを1件以上選択してください");

    try {
      if (!isEditMode) {
        const result = await createOidcClient({ ...formData, allowed_redirect_uris: normalizedUris });
        // toast.success("作成成功。シークレットをコピーします");
        await copyToClipboard(result.client_secret, "作成成功。クリップボードにコピーしました"); 
      } else {
        await updateOidcClient(formData.client_id, {
          ...formData,
          allowed_redirect_uris: normalizedUris,
        });
        toast.success("更新成功");
      }
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err, "保存に失敗しました"));
    }
  };

  return (
    <div className="bg-white p-6 border rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4 border-b pb-2">
        {isEditMode ? "OIDCクライアント編集" : "新規OIDCクライアント作成"}
      </h2>
      <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {isEditMode 
          ? "シークレットの再取得はできません。必要なら一覧で再発行してください。" 
          : "作成時に通知されるシークレットは、このタイミングのみ取得可能です。"}
      </div>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm mb-1">アプリ名</label>
          <input
            className="border p-2 w-full rounded"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
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
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">説明</label>
          <input
            className="border p-2 w-full rounded"
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">リダイレクトURI（1行に1件）</label>
          <textarea
            className="border p-2 w-full rounded min-h-32"
            value={redirectUrisText}
            onChange={(e) => setRedirectUrisText(e.target.value)}
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