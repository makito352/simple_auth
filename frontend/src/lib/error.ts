
/**
 * @file frontend/src/lib/error.ts
 * @description APIエラー処理に関するユーティリティ関数を提供します。
 */
import { logger } from "@/lib/logger";
import type { ApiError } from "@/lib/api/client";

/**
 * APIエラーの内容に基づいて表示用メッセージを生成する
 * @param error - キャッチされたエラーオブジェクト
 * @param defaultMessage - エラー内容が取得できない場合のデフォルトメッセージ
 * @returns 表示用のエラーメッセージ
 */
export const getErrorMessage = (err: ApiError, defaultMessage: string): string => {
    if (err.status >= 400 && err.status < 500) {
        // クライアントエラー(400-499)の場合、詳細情報を優先的に表示
        // ※バックエンドで必要がある場合はwarn/errorを出力しているため、ここではdebugレベルで出力
        logger.debug(`Client Error (${err.status}): ${err}`);
        return err.detail || err.message || defaultMessage;
    } else if (err.status >= 500) {
        // サーバーエラー(500以上)の場合、汎用的なメッセージを表示
        logger.error(`Server Error (${err.status}): ${err}`);
        return "システムエラーが発生しました。管理者に問い合わせてください。";
    }
    return defaultMessage;
};