/**
 * @file oidc.ts
 * @description OIDCクレームマッピングに関するAPI操作
 */
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "./client";
import {
  ClaimMapping,
  ClaimMappingInput,
  OidcClient,
  OidcClientInput,
  OidcClientUpdateInput,
  OidcClientWithSecret,
  OidcScope,
  OidcScopeInput,
  OidcScopeUpdateInput,
} from "@/types";

/**
 * すべてのマッピングルールを取得する
 */
export async function fetchClaimMappings(): Promise<ClaimMapping[]> {
  const data = await apiGet("/admin/oidc/mappings");
  return data as ClaimMapping[];
}

/**
 * 特定のIDのマッピングを取得する
 * @param mappingId マッピングの識別子（UUID）
 */
export async function fetchClaimMappingById(mappingId: string): Promise<ClaimMapping> {
  const data = await apiGet(`/admin/oidc/mappings/${mappingId}`);
  return data as ClaimMapping;
}


/**
 * 新しいマッピングルールを作成する
 * @param data 作成するマッピングのデータ
 */
export async function createClaimMapping(data: ClaimMappingInput): Promise<ClaimMapping> {
  const response = await apiPost("/admin/oidc/mappings", data);
  return response as ClaimMapping;
}

/**
 * 既存のマッピングを更新する
 * @param mappingId マッピングの識別子（UUID）
 * @param data 更新するマッピングのデータ
 */
export async function updateClaimMapping(
  mappingId: string,
  data: ClaimMappingInput
): Promise<ClaimMapping> {
  const response = await apiPut(`/admin/oidc/mappings/${mappingId}`, data);
  return response as ClaimMapping;
}

/**
 * マッピングを削除する
 * @param mappingId マッピングの識別子（UUID）
 */
export async function deleteClaimMapping(mappingId: string): Promise<void> {
  await apiDelete(`/admin/oidc/mappings/${mappingId}`);
}

/**
 * OIDCで利用可能なスコープ一覧を取得する
 */
export async function fetchOidcScopes(): Promise<OidcScope[]> {
  const data = await apiGet("/admin/oidc/scopes");
  return data as OidcScope[];
}

/**
 * OIDCスコープを作成する
 */
export async function createOidcScope(input: OidcScopeInput): Promise<OidcScope> {
  const data = await apiPost("/admin/oidc/scopes", input);
  return data as OidcScope;
}

/**
 * OIDCスコープの説明を更新する
 */
export async function updateOidcScope(
  scopeName: string,
  input: OidcScopeUpdateInput,
): Promise<OidcScope> {
  const data = await apiPut(`/admin/oidc/scopes/${scopeName}`, input);
  return data as OidcScope;
}

/**
 * OIDCスコープを削除する
 */
export async function deleteOidcScope(scopeName: string): Promise<void> {
  await apiDelete(`/admin/oidc/scopes/${scopeName}`);
}

/**
 * OIDCクライアント一覧を取得する
 */
export async function fetchOidcClients(): Promise<OidcClient[]> {
  const data = await apiGet("/admin/oidc/clients");
  return data as OidcClient[];
}

/**
 * OIDCクライアントを作成する
 */
export async function createOidcClient(
  input: OidcClientInput,
): Promise<OidcClientWithSecret> {
  const data = await apiPost("/admin/oidc/clients", input);
  return data as OidcClientWithSecret;
}

/**
 * OIDCクライアントを更新する
 */
export async function updateOidcClient(
  clientId: string,
  input: OidcClientUpdateInput,
): Promise<OidcClient> {
  const data = await apiPut(`/admin/oidc/clients/${clientId}`, input);
  return data as OidcClient;
}

/**
 * OIDCクライアントのシークレットを再発行する
 */
export async function rotateOidcClientSecret(
  clientId: string,
): Promise<OidcClientWithSecret> {
  const data = await apiPost(`/admin/oidc/clients/${clientId}/rotate-secret`);
  return data as OidcClientWithSecret;
}

/**
 * OIDCクライアントの有効状態を切り替える
 */
export async function setOidcClientActive(
  clientId: string,
  isActive: boolean,
): Promise<OidcClient> {
  const data = await apiPatch(`/admin/oidc/clients/${clientId}/active`, {
      is_active: isActive,
    });
  return data as OidcClient;
}