import { apiGet } from "./client";

/**
 * ワンタイムリンクのトークンを検証する。
 * @param token - URLに含まれるワンタイムリンク用トークン
 * @returns 検証に成功した場合はユーザーIDを含むオブジェクトを、失敗または存在しない場合は null を返す。
 */
export async function verifyOneTimeLink(token: string | null): Promise<any | null> {
  if (!token) {
    console.error("No token provided for verification");
    return null;
  }

  try {
    const response = await apiGet(`/auth/one-time-link/verify?token=${token}`);
    // レスポンスにuser_idが含まれているか確認
    return response && response.user_id ? response : null;
  } catch (error) {
    console.error("Failed to verify one-time link:", error);
    return null;
  }
}