/**
 * @file frontend/src/lib/api/one_time_link.ts
 * @description ワンタイムリンク関連のAPI操作
 */
import { apiGet, apiPost } from "./client";
import type { OneTimeLinkCreateResponse, OneTimeLinkVerificationResponse } from "@/types";

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