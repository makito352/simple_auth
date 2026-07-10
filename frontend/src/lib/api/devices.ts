/**
 * @file frontend/src/lib/api/devices.ts
 * @description WebAuthnデバイス管理APIへのアクセス関数を提供する。
 */

import { apiDelete, apiGet, apiPatch } from "@/lib/api/client";
import type { DeviceCredential } from "@/types";
/**
 * ログイン中ユーザーのデバイス一覧を取得する。
 */
export async function fetchDeviceCredentials(): Promise<DeviceCredential[]> {
  const response = await apiGet("/webauthn/credentials");
  return response as DeviceCredential[];
}

/**
 * 指定デバイスのコメントを更新する。
 */
export async function updateDeviceComment(
  credentialId: string,
  comment: string | null,
): Promise<void> {
  await apiPatch(`/webauthn/credentials/${credentialId}/comment`, { comment });
}

/**
 * 指定デバイスを削除する。
 */
export async function deleteDeviceCredential(credentialId: string): Promise<void> {
  await apiDelete(`/webauthn/credentials/${credentialId}`);
}

