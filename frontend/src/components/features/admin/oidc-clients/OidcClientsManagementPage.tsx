"use client";
import { Edit2, KeyRound, Plus, Save } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { copyToClipboard } from "@/components/common/common_utils";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  createOidcClient,
  fetchOidcClients,
  fetchOidcScopes,
  rotateOidcClientSecret,
  updateOidcClient,
} from "@/lib/api/oidc";
import { getErrorMessage } from "@/lib/error";
import type {
  OidcClient,
  OidcClientInput,
  OidcClientUpdateInput,
  OidcScope,
} from "@/types";

import { ClientForm } from "./components/client-form";
import { ClientTable } from "./components/client-table";

type EditingState = {
  mode: "create" | "edit";
  clientId?: string;
};

const INITIAL_FORM: OidcClientInput = {
  name: "",
  client_id: "",
  description: "",
  allowed_redirect_uris: [],
  scope_names: [],
  is_active: true,
};

function parseRedirectUris(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function OidcClientManagementPage() {
  const [clients, setClients] = useState<OidcClient[]>([]);
  const [scopes, setScopes] = useState<OidcScope[]>([]);
  const [loading, setLoading] = useState(true);
  /** 編集モードの状態（作成・編集） */
  const [editingData, setEditingData] = useState<{ mode: "create" | "edit"; data?: OidcClientInput } | null>(null);

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

  /** 新規作成ボタン */
  const handleOpenCreate = () => {
    setEditingData({ mode: "create" });
  };

  /** 編集ボタン */
  const handleOpenEdit = (client: OidcClient) => {
    setEditingData({ mode: "edit", data: client_to_input(client) });
  };

  /** シークレット再発行 */
  const handleRotateSecret = async (clientId: string) => {
    if (!confirm("クライアントシークレットを再発行します。よろしいですか？")) return;
    try {
      const result = await rotateOidcClientSecret(clientId);
      toast.success("シークレットを再発行しました。新しいシークレットをコピーします");
      await copyToClipboard(result.client_secret, "rotate");
      await loadData();
    } catch (error) {
      const errorMessage = getErrorMessage(error, "シークレット再発行に失敗しました");
      toast.error(errorMessage);
    }
  };
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

      {editingData && (
        <ClientForm 
          initialData={editingData.data || INITIAL_FORM} 
          scopes={scopes} 
          onSuccess={() => { setEditingData(null); loadData(); }} 
        />
      )}
      <ClientTable 
        clients={clients} 
        onEdit={handleOpenEdit}
        onRotateSecret={handleRotateSecret}
      />
    </div>
  );
}

// const [formData, setFormData] = useState<OidcClientInput>(INITIAL_FORM);
// const [redirectUrisText, setRedirectUrisText] = useState("");