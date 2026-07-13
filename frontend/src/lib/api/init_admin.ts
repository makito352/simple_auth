/**
 * @file frontend/src/lib/api/init_admin.ts
 * @description 初期管理者認証に関するAPI操作
 */
import { apiPost } from "./client";

/**
 * 初期管理者のログイン成功時レスポンスの型定義
 * (backend/app/schemas/auth.py の InitialAdminLoginResponse に対応)
 */
export interface InitialAdminLoginResponse {
  user_id: string;    // ユーザーのID
  email: string;       // ユーザーのメールアドレス
  status: string;      // メール認証ステータス
}

/**
 * 初期管理者のログインリクエストの型定義
 * (backend/app/schemas/auth.py の InitialAdminLoginRequest に対応)
 */
export interface InitialAdminLoginRequest {
  email: string;       // 管理者用メールアドレス
  password: string;    // パスワード（最低8文字）
}

/**
 * 初期管理者のログインを実行します。
 * 認証に成功すると、バックエンドからセッションクッキーがセットされます。
 * 
 * @param data - Loginリクエストデータ（email, password）
 * @returns 認証成功時のレスポンス情報
 */
export async function loginInitialAdmin(data: InitialAdminLoginRequest): Promise<InitialAdminLoginResponse> {
  const response = await apiPost("/auth/init-admin/login", data);
  return response as InitialAdminLoginResponse;
}