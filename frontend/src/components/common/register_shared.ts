/**
 * @file frontend/src/components/features/register/register_shared.ts
 * @description 登録画面（通常/初期管理者）で共通利用する定数とエラーユーティリティ。
 */

import type { ApiError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error";

/**
 * 成功後の自動遷移待機時間（ミリ秒）。
 */
export const REGISTER_REDIRECT_DELAY_MS = 3000;

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
