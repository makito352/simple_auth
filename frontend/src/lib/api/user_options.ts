/**
 * @file frontend/src/lib/api/user_options.ts
 * @description ユーザーのオプション設定に関するAPI操作
 */
import { OptionAttribute, UserOption } from "@/types";

import { apiGet, apiPatch, apiPost, apiPut } from "./client";

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
  const data = await apiGet("/admin/user-options/attributes");
  return data as OptionAttribute[];
}

/**
 * 新しい属性（マスタ）を作成する
 * @param body 作成する属性のデータ
 */
export async function createOptionAttribute(
  body: Pick<OptionAttribute, 'key' | 'encrypted'>
): Promise<OptionAttribute> {
  const data = await apiPost("/admin/user-options/attributes", body);
  return data as OptionAttribute;
}

/**
 * 属性（マスタ）を更新する
 * @param id 更新する属性のID
 * @param body 更新する属性のデータ
 */
export async function updateOptionAttribute(
  id: string,
  body: Pick<OptionAttribute, 'key' | 'encrypted'>
): Promise<OptionAttribute> {
  const data = await apiPut(`/admin/user-options/attributes/${id}`, body);
  return data as OptionAttribute;
}

/**
 * ユーザーのオプション設定を取得する
 * @param userId ユーザーのUUID
 */
export async function fetchUserOptions(userId: string): Promise<UserOption[]> {
  const data = await apiGet(`/admin/user-options/${userId}/options`);
  return data as UserOption[];
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
  const data = await apiPatch(`/admin/user-options/${userId}/options`, {
      options: options,
    });
  return data as UserOption[];
}