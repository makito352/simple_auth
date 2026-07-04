/**
 * @file logger.ts
 * @description 開発環境と本番環境でコンソール出力の挙動を制御するためのロガー
 */

/**
 * 現在の環境設定を取得します。
 * NODE_ENV または独自の ENV 変数を参照します。
 * @returns {string} 'development' | 'production'
 */
const currentEnv = process.env.NEXT_PUBLIC_ENV || 'development';

/**
 * 開発環境かどうかを判定します。
 * @returns {boolean} 開発環境であればtrue
 */
const isDevelopment = currentEnv === 'development';
const enableDebugLogs = process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true' || isDevelopment;

/**
 * メッセージをコンソールに出力します。
 * 開発環境のみで出力されるログや、警告、エラーなどのレベルを管理しやすくなります。
 * 
 * @param {string} message - 出力するメッセージ
 * @param {string} [level='info'] - ログのレベル (info, warn, error)
 */
export const logger = {
  /**
   * 基本的な情報の出力（開発環境のみ出力）
   * @param {string} message 
   */
  debug: (message: string) => {
    if (enableDebugLogs) {
      console.log(`[DEBUG] ${message}`);
    }
  },

  /**
   * 警告の出力（開発および本番で必要に応じて出力）
   * @param {string} message 
   */
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
  },

  /**
   * エラーの出力（常に出力）
   * @param {string} message 
   */
  error: (message: string) => {
    console.error(`[ERROR] ${message}`);
  },
};