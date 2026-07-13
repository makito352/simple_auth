/**
 * @file  frontend/src/components/features/admin/oidc-clients/OidcClientsManagementPage.tsx
 * @description OIDCクライアントの登録、編集、シークレットの再発行を管理するページコンポーネント。
 */

"use client";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { copyToClipboard } from "@/components/common/common_utils";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  fetchOidcClients,
  fetchOidcScopes,
  rotateOidcClientSecret,
} from "@/lib/api/oidc";
import { getErrorMessage } from "@/lib/error";
import type {
  OidcClient,
  OidcClientInput,
  OidcScope,
} from "@/types";

import { ClientForm } from "./components/client-form";
import { ClientTable } from "./components/client-table";

/** フォーム初期値の型定義と定数 */
const INITIAL_FORM: OidcClientInput = {
  name: "",
  client_id: "",
  description: "",
  allowed_redirect_uris: [],
  scope_names: [],
  is_active: true,
};

/**
 * OIDCクライアント管理ページコンポーネント
 * @returns ページ全体のUI構造
 */
export default function OidcClientManagementPage() {
  const [clients, setClients] = useState<OidcClient[]>([]);
  const [scopes, setScopes] = useState<OidcScope[]>([]);
  const [loading, setLoading] = useState(true);
  /** 編集モードの状態（create: 新規作成、edit: 既存の編集） */
  const [editingData, setEditingData] = useState<{ mode: "create" | "edit"; data?: OidcClientInput } | null>(null);

  /** 初期データの読み込み（クライアント一覧とスコープ一覧） */
  const loadData = async () => {
    try {
      const [clientsData, scopesData] = await Promise.all([
        fetchOidcClients(),
        fetchOidcScopes(),
      ]);
      setClients(clientsData);
      setScopes(scopesData);
    } catch (error) {
      const errorMessage = getErrorMessage(error, "OIDCクライアント情報の取得に失敗しました");
      toast.error(errorMessage);
    }
  };

  /** 新規作成モーダル（またはフォーム）を開く */
  const handleOpenCreate = () => {
    setEditingData({ mode: "create" });
  };

  /** 特定のクライアントを編集するモードに切り替える */
  const handleOpenEdit = (client: OidcClient) => {
    setEditingData({ mode: "edit", data: client_to_input(client) });
  };

  /** クライアントシークレットの再発行処理 */
  const handleRotateSecret = async (clientId: string) => {
    if (!confirm("クライアントシークレットを再発行します。よろしいですか？")) return;
    try {
      const result = await rotateOidcClientSecret(clientId);
      toast.success("シークレットを再発行しました。新しいシークレットをコピーします");
      // 成功時にクリップボードへ自動コピーを実行
      await copyToClipboard(result.client_secret, "rotate");
      // 最新の状態に更新するためデータを再取得
      await loadData();
    } catch (error) {
      const errorMessage = getErrorMessage(error, "シークレット再発行に失敗しました");
      toast.error(errorMessage);
    }
  };

  /** 
   * APIレスポンスのOidcClient型を、フォーム用のOidcClientInput型に変換する
   * @param client OidcClientオブジェクト
   * @returns OidcClientInput型
   */
  function client_to_input(client: OidcClient): OidcClientInput {
    return {
      name: client.name,
      client_id: client.client_id,
      description: client.description,
      allowed_redirect_uris: client.allowed_redirect_uris,
      scope_names: client.scope_names,
      is_active: client.is_active,
    };
  }

  /** 初回レンダリング時にデータをロード */
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

  if (loading) return <LoadingSpinner />;

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

      {/* 編集モードまたは新規作成モードの際にフォームを表示 */}
      {editingData && (
        <ClientForm 
          initialData={editingData.data || INITIAL_FORM} 
          scopes={scopes} 
          onSuccess={() => { setEditingData(null); loadData(); }} 
        />
      )}
      
      {/* クライアント一覧テーブルの表示 */}
      <ClientTable 
        clients={clients} 
        onEdit={handleOpenEdit}
        onRotateSecret={handleRotateSecret}
      />
    </div>
  );
}