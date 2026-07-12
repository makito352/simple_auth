/**
 * @file frontend/src/components/common/register_shared.ts
 * @description 画面で共通利用する定数とエラーユーティリティ。
 */

import type { ApiError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error";

/**
 * ユーザ登録成功後の自動遷移待機時間（ミリ秒）。
 */
export const REGISTER_REDIRECT_DELAY_MS = 3000;
/**
 * クリップボードコピー成功時に「コピー済み」状態を維持する待機時間（ミリ秒）。
 */
export const COPY_SUCCESS_DISPLAY_DURATION_MS = 2000;

/**
 * 指定したエラーオブジェクトがAPIエラーかどうかを判定する型ガード。
 *
 * @param error 判定対象のエラー
 * @returns APIエラーであれば true
 */
export function isApiError(error: unknown): error is ApiError {
  return Boolean(error && typeof error === "object" && "status" in error);
}

/**
 * 登録画面向けにエラーメッセージを正規化する。
 *
 * @param error キャッチしたエラー
 * @param apiDefaultMessage APIエラー時に利用する既定メッセージ
 * @param nonApiMessage 非APIエラー時に表示するメッセージ
 * @returns 画面表示向けのメッセージ
 */
export function resolveRegisterErrorMessage(
  error: unknown,
  apiDefaultMessage: string,
  nonApiMessage: string,
): string {
  if (isApiError(error)) {
    return getErrorMessage(error, apiDefaultMessage);
  }

  return nonApiMessage;
}
