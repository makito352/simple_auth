/**
 * @file one_time_link.ts
 * @description ワンタイムリンク関連のAPI操作
 */
import { apiGet } from "./client";
import { logger } from "@/lib/logger";

/**
 * ワンタイムリンクのトークンを検証する。
 * @param token - URLに含まれるワンタイムリンク用トークン
 * @returns 検証に成功した場合はユーザーIDを含むオブジェクトを、失敗または存在しない場合は null を返す。
 */
export async function verifyOneTimeLink(token: string | null): Promise<any | null> {
  if (!token) {
    logger.error("No token provided for verification");
    return null;
  }

  try {
    const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
    // レスポンスにuser_idが含まれているか確認
    return response && response.user_id ? response : null;
  } catch (error) {
    logger.error(`Failed to verify one-time link: ${error}`);
    return null;
  }
}