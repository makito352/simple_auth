/**
 * @file auth.ts
 * @description 認証関連の共通設定を管理します。
 */

/**
 * セッションクッキーの名前
 * 環境変数から取得し、バックエンドとフロントエンドで一致させるために使用します。
 */
export const SESSION_COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'simpleauth_session';