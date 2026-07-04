/**
 * @file devices.ts
 * @description WebAuthnデバイス管理APIへのアクセス関数を提供する。
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

/**
 * WebAuthn資格情報の一覧表示用モデル。
 */
export interface DeviceCredential {
  id: string;
  credential_id: string;
  device_name: string | null;
  user_comment: string | null;
  created_at: string;
}

/**
 * 追加デバイス登録用ワンタイムリンクのレスポンスモデル。
 */
export interface DeviceRegistrationLink {
  token: string;
  url: string;
  expires_at: string;
  message: string;
}

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

/**
 * ログイン中ユーザー向けの追加デバイス登録リンクを発行する。
 */
export async function createDeviceRegistrationLink(): Promise<DeviceRegistrationLink> {
  const response = await apiPost("/auth/one-time-link/create/self");
  return response as DeviceRegistrationLink;
}
