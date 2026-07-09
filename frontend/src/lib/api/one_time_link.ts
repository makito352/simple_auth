/**
 * @file one_time_link.ts
 * @description ワンタイムリンク関連のAPI操作
 */
import { apiGet } from "./client";
import { logger } from "@/lib/logger";
import { OneTimeLinkVerificationResponse } from "@/types";

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

  try {
    const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
    // レスポンスにuser_idが含まれているか確認
    if (response && response.user_id) {
      return response as OneTimeLinkVerificationResponse;
    } else {
      throw new Error("Invalid or expired token");
    }
  } catch (error) {
    // backend側で400を返している場合は、そのメッセージが含まれている
    const status = error?.response?.status;
    
    if (status && status >= 400 && status < 500) {
      // クライアントエラーの場合は原因を特定しやすくするためメッセージをそのまま投げる
      const message = error.response?.data?.message || "Invalid or expired token";
      throw new Error(message); 
    }

    // 500系やその他の予期せぬエラーは、ログに詳細を出力して、汎用的なエラーメッセージを投げる
    // リリース環境ではバックエンド側のログで確認する。
    logger.debug(`System error during link verification: ${JSON.stringify(error)}`);
    throw new Error("Internal Server Error");
  }
}