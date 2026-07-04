// frontend/src/types/index.ts
export type UserRole = 'user' | 'admin';

/**
 * ユーザーの基本情報の型定義
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * 設定項目のマスタデータ (backend/app/schemas/user_option.py の OptionAttributeOut に対応)
 * 例: imap_server, smtp_port などの定義情報
 */
export interface OptionAttribute {
  id: string;           // 属性のユニークID (UUID)
  key: string;          // 属性のキー（例: imap_server、smtp_portなど）
  encrypted: boolean;   // この項目が暗号化されているかどうかのフラグ
}

/**
 * 個別の設定項目の値 (backend/app/schemas/user_option.py の UserOptionOut に対応)
 */
export interface UserOption {
  key: string;          // 設定項目のキー（OptionAttributeと対応）
  value: string;        // 設定項目の値（文字列として保持）
}
/**
 * OIDCクレームマッピングの型定義 (backend/app/schemas/oidc.py の ClaimMappingResponse に対応)
 */
export type ClaimMappingValueSource = "static" | "user_attribute" | "user_profile";

export interface ClaimMapping {
  id: string;           // 識別子（UUID）
  scope: string;        // スコープ（例: openid, profileなど）
  claim_name: string;   // クレーム名（例: sub, emailなど）
  value_source: ClaimMappingValueSource; // 値の取得元（ValueSourceTypeの値）
  value_key?: string;   // 動的に値を抽出するためのキー
  static_value?: string; // 固定値として設定する文字列
}

export type ClaimMappingInput = Omit<ClaimMapping, "id">;