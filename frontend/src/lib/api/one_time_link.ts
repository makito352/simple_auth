/**
 * @file frontend/src/lib/api/one_time_link.ts
 * @description ワンタイムリンク関連のAPI操作
 */
import { apiGet, apiPost } from "./client";
import type {
  LinkType,
  OneTimeLinkCreateResponse,
  OneTimeLinkGetResponse,
  OneTimeLinkVerificationResponse,
} from "@/types";
import type { ApiError } from "./client";

/**
 * ログイン中ユーザー向けの追加デバイス登録リンクを発行する。
 */
export async function createDeviceRegistrationLink(): Promise<OneTimeLinkCreateResponse> {
  const response = await apiPost("/auth/one-time-link/create/self");
  return response as OneTimeLinkCreateResponse;
}

/**
 * ワンタイムリンクのトークンを検証する。
 * @param token - URLに含まれるワンタイムリンク用トークン
 * @returns 検証に成功した場合はユーザーIDを含むオブジェクトを、失敗または存在しない場合はエラーを投げる。
 */
export async function verifyOneTimeLink(token: string | null): Promise<OneTimeLinkVerificationResponse> {
  if (!token) {
    // 呼び元でログ出力しているため、ここではログ出力は行わない
    // logger.error("No token provided for verification");

    // トークンが提供されていない場合はエラーを投げる
    throw new Error("No token provided for verification");
  }
  const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
  return response as OneTimeLinkVerificationResponse;
}

/**
 * 【管理者向け】登録用ワンタイムリンクを発行する。
 * @param userId - 発行対象ユーザーID
 */
export async function createRegistrationLinkForAdmin(userId: string): Promise<OneTimeLinkCreateResponse> {
  const response = await apiPost("/auth/one-time-link/create", { user_id: userId });
  return response as OneTimeLinkCreateResponse;
}

/**
 * 【管理者向け】機器追加（再登録）用ワンタイムリンクを発行する。
 * @param userId - 発行対象ユーザーID
 */
export async function createReregistrationLinkForAdmin(userId: string): Promise<OneTimeLinkCreateResponse> {
  const response = await apiPost("/auth/one-time-link/create/rereg", { user_id: userId });
  return response as OneTimeLinkCreateResponse;
}

/**
 * 【管理者向け】指定ユーザーの未使用ワンタイムリンクを取得する。
 * 404の場合は「対象リンクなし」としてnullを返す。
 * @param userId - 対象ユーザーID
 * @param linkType - 取得対象のリンク種別
 */
export async function getOneTimeLinkByUserIdForAdmin(
  userId: string,
  linkType: LinkType,
): Promise<OneTimeLinkGetResponse | null> {
  try {
    const response = await apiGet("/auth/one-time-link/get-by-user-id", {
      user_id: userId,
      link_type: linkType,
    });
    return response as OneTimeLinkGetResponse;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      return null;
    }
    throw error;
  }
}