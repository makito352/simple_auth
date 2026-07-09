/**
 * @file user_options.ts
 * @description ユーザーのオプション設定に関するAPI操作
 */
import { apiGet, apiPatch, apiPost, apiPut } from "./client";
import { logger } from "@/lib/logger";
import { OptionAttribute, UserOption } from "@/types";

/**
 * 一括更新用のデータ構造 (backend/app/schemas/user_option.py の UserOptionBulkUpdate に対応)
 */
export interface UserOptionBulkUpdateRequest {
  options: UserOption[];
}

/**
 * 属性（マスタ）の一覧を取得する
 * 管理者用機能。例: imap_server, smtp_port 等の定義リスト
 */
export async function fetchOptionAttributes(): Promise<OptionAttribute[]> {
  try {
    const data = await apiGet("/admin//user-options/attributes");
    return data;
  } catch (error) {
    logger.error(`Failed to fetch option attributes: ${error}`);
    throw error;
  }
}

export async function createOptionAttribute(
  body: Pick<OptionAttribute, 'key' | 'encrypted'>
): Promise<OptionAttribute> {
  try {
    const data = await apiPost("/admin//user-options/attributes", body);
    return data;
  } catch (error) {
    logger.error(`Failed to create option attribute: ${error}`);
    throw error;
  }
}

export async function updateOptionAttribute(
  id: string,
  body: Pick<OptionAttribute, 'key' | 'encrypted'>
): Promise<OptionAttribute> {
  try {
    const data = await apiPut(`/admin//user-options/attributes/${id}`, body);
    return data;
  } catch (error) {
    logger.error(`Failed to update option attribute: ${error}`);
    throw error;
  }
}

/**
 * ユーザーのオプション設定を取得する
 * @param userId ユーザーのUUID
 */
export async function fetchUserOptions(userId: string): Promise<UserOption[]> {
  try {
    const data = await apiGet(`/admin//user-options/${userId}/options`);
    return data;
  } catch (error) {
    logger.error(`Failed to fetch user options for ${userId}: ${error}`);
    throw error;
  }
}

/**
 * ユーザーのオプションを一括更新する
 * @param userId ユーザーのUUID
 * @param options 更新対象のオプション配列
 */
export async function updateUserOptions(
  userId: string,
  options: UserOption[]
): Promise<UserOption[]> {
  try {
    const data = await apiPatch(`/admin//user-options/${userId}/options`, {
      options: options,
    });
    return data;
  } catch (error) {
    logger.error(`Failed to update user options for ${userId}: ${error}`);
    throw error;
  }
}