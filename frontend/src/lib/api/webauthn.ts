import { apiPost } from "./client";

/**
 * ユーザーをログアウトする。
 * バックエンドの /webauthn/logout を呼び出す。
 */
export async function logout(): Promise<void> {
  // backendが204を返すため、apiPost(または内部のrequest)はnullを返すが
  // 型定義としてvoid（何も返さない）として扱うのが適切です。
  await apiPost("/webauthn/logout");
}