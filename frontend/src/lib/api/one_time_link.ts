/**
 * @file one_time_link.ts
 * @description ワンタイムリンク関連のAPI操作
 */
import { apiGet, apiPost } from "./client";
import { logger } from "@/lib/logger";
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
    // トークンが提供されていない場合はエラーを投げる
    logger.error("No token provided for verification");
    throw new Error("No token provided for verification");
  }
  const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
  return response as OneTimeLinkVerificationResponse;
}