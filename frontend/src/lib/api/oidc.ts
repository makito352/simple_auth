/**
 * @file oidc.ts
 * @description OIDCクレームマッピングに関するAPI操作
 */
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "./client";
import { logger } from "@/lib/logger";
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
  try {
    const data = await apiGet("/admin_oidc/mappings");
    return data;
  } catch (error) {
    logger.error(`Failed to fetch claim mappings: ${error}`);
    throw error;
  }
}

/**
 * 特定のIDのマッピングを取得する
 * @param mappingId マッピングの識別子（UUID）
 */
export async function fetchClaimMappingById(mappingId: string): Promise<ClaimMapping> {
  try {
    const data = await apiGet(`/admin_oidc/mappings/${mappingId}`);
    return data;
  } catch (error) {
    logger.error(`Failed to fetch claim mapping ${mappingId}: ${error}`);
    throw error;
  }
}

/**
 * 新しいマッピングルールを作成する
 * @param data 作成するマッピングのデータ
 */
export async function createClaimMapping(data: ClaimMappingInput): Promise<ClaimMapping> {
  try {
    const response = await apiPost("/admin_oidc/mappings", data);
    return response;
  } catch (error) {
    logger.error(`Failed to create claim mapping: ${error}`);
    throw error;
  }
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
  try {
    const response = await apiPut(`/admin_oidc/mappings/${mappingId}`, data);
    return response;
  } catch (error) {
    logger.error(`Failed to update claim mapping ${mappingId}: ${error}`);
    throw error;
  }
}

/**
 * マッピングを削除する
 * @param mappingId マッピングの識別子（UUID）
 */
export async function deleteClaimMapping(mappingId: string): Promise<void> {
  try {
    await apiDelete(`/admin_oidc/mappings/${mappingId}`);
  } catch (error) {
    logger.error(`Failed to delete claim mapping ${mappingId}: ${error}`);
    throw error;
  }
}

/**
 * OIDCで利用可能なスコープ一覧を取得する
 */
export async function fetchOidcScopes(): Promise<OidcScope[]> {
  try {
    const data = await apiGet("/admin_oidc/scopes");
    return data;
  } catch (error) {
    logger.error(`Failed to fetch OIDC scopes: ${error}`);
    throw error;
  }
}

/**
 * OIDCスコープを作成する
 */
export async function createOidcScope(input: OidcScopeInput): Promise<OidcScope> {
  try {
    const data = await apiPost("/admin_oidc/scopes", input);
    return data;
  } catch (error) {
    logger.error(`Failed to create OIDC scope: ${error}`);
    throw error;
  }
}

/**
 * OIDCスコープの説明を更新する
 */
export async function updateOidcScope(
  scopeName: string,
  input: OidcScopeUpdateInput,
): Promise<OidcScope> {
  try {
    const data = await apiPut(`/admin_oidc/scopes/${scopeName}`, input);
    return data;
  } catch (error) {
    logger.error(`Failed to update OIDC scope ${scopeName}: ${error}`);
    throw error;
  }
}

/**
 * OIDCスコープを削除する
 */
export async function deleteOidcScope(scopeName: string): Promise<void> {
  try {
    await apiDelete(`/admin_oidc/scopes/${scopeName}`);
  } catch (error) {
    logger.error(`Failed to delete OIDC scope ${scopeName}: ${error}`);
    throw error;
  }
}

/**
 * OIDCクライアント一覧を取得する
 */
export async function fetchOidcClients(): Promise<OidcClient[]> {
  try {
    const data = await apiGet("/admin_oidc/clients");
    return data;
  } catch (error) {
    logger.error(`Failed to fetch OIDC clients: ${error}`);
    throw error;
  }
}

/**
 * OIDCクライアントを作成する
 */
export async function createOidcClient(
  input: OidcClientInput,
): Promise<OidcClientWithSecret> {
  try {
    const data = await apiPost("/admin_oidc/clients", input);
    return data;
  } catch (error) {
    logger.error(`Failed to create OIDC client: ${error}`);
    throw error;
  }
}

/**
 * OIDCクライアントを更新する
 */
export async function updateOidcClient(
  clientId: string,
  input: OidcClientUpdateInput,
): Promise<OidcClient> {
  try {
    const data = await apiPut(`/admin_oidc/clients/${clientId}`, input);
    return data;
  } catch (error) {
    logger.error(`Failed to update OIDC client ${clientId}: ${error}`);
    throw error;
  }
}

/**
 * OIDCクライアントのシークレットを再発行する
 */
export async function rotateOidcClientSecret(
  clientId: string,
): Promise<OidcClientWithSecret> {
  try {
    const data = await apiPost(`/admin_oidc/clients/${clientId}/rotate-secret`);
    return data;
  } catch (error) {
    logger.error(`Failed to rotate OIDC client secret ${clientId}: ${error}`);
    throw error;
  }
}

/**
 * OIDCクライアントの有効状態を切り替える
 */
export async function setOidcClientActive(
  clientId: string,
  isActive: boolean,
): Promise<OidcClient> {
  try {
    const data = await apiPatch(`/admin_oidc/clients/${clientId}/active`, {
      is_active: isActive,
    });
    return data;
  } catch (error) {
    logger.error(`Failed to toggle OIDC client active ${clientId}: ${error}`);
    throw error;
  }
}