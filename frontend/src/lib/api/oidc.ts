/**
 * @file oidc.ts
 * @description OIDCクレームマッピングに関するAPI操作
 */
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import { logger } from "../logger";
import { ClaimMapping, ClaimMappingInput } from "../../types";

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