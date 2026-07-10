/**
 * @file frontend/src/types/index.ts
 * @description APIレスポンスやフロントエンドで使用するデータ構造の型定義をまとめたファイルです。
 * このファイルはアプリケーション全体で使用される基本的なデータ構造、
 * ユーザー権限、設定項目、OIDC関連の設定などを定義します。
 */


/**
 * ユーザーの権限レベルを表す列挙型
 */
export type UserRole = 'user' | 'admin';

/**
 * ユーザーの基本情報の型定義
 */
export interface User {
  id: string;        // ユーザーの一意識別子 (UUID)
  email: string;     // ユーザーのメールアドレス
  role: UserRole;    // ユーザーの権限レベル
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

/**
 * クレームのマッピング定義（値の取得元と、そのためのキーや静的な値を管理）
 */
export interface ClaimMapping {
  id: string;           // 識別子（UUID）
  scope: string;        // スコープ（例: openid, profileなど）
  claim_name: string;   // クレーム名（例: sub, emailなど）
  value_source: ClaimMappingValueSource; // 値の取得元（ValueSourceTypeの値）
  value_key?: string;   // 動的に値を抽出するためのキー
  static_value?: string; // 固定値として設定する文字列
}

/**
 * クレームマッピングの作成・更新用入力型 (IDを除外)
 */
export type ClaimMappingInput = Omit<ClaimMapping, "id">;

/**
 * OIDCクライアント管理の型定義
 */
export interface OidcScope {
  scope_name: string;         // スコープ名（例: profile）
  description?: string;       // スコープの説明
  is_system_scope: boolean;   // システム用スコープかどうかのフラグ
  is_deletable: boolean;      // 削除可能かどうかのフラグ
}

/**
 * OidcScope作成用の入力型
 */
export interface OidcScopeInput {
  scope_name: string;
  description?: string;
}

/**
 * OidcScope更新用の入力型
 */
export interface OidcScopeUpdateInput {
  description?: string;
}

/**
 * OIDCクライアントの基本情報の定義（シークレットはマスクされた状態で保持）
 */
export interface OidcClient {
  id: string;                    // 内部ID (UUID)
  name: string;                  // 表示名
  client_id: string;             // OIDCクライアント識別子
  client_secret_masked: string;  // マスクされたシークレット
  description?: string;          // 説明文
  allowed_redirect_uris: string[]; // 許可されたリダイレクトURLのリスト
  scope_names: string[];        // 関連するスコープ名のリスト
  is_active: boolean;            // 有効状態フラグ
  created_at?: string;           // 作成日時
  updated_at?: string;           // 更新日時
}

/**
 * OIDCクライアントの詳細情報（シークレットを平文で含む）
 */
export interface OidcClientWithSecret extends OidcClient {
  client_secret: string;        // 生のシークレット
}

/**
 * OidcClient作成用の入力型
 */
export interface OidcClientInput {
  name: string;
  client_id: string;
  description?: string;
  allowed_redirect_uris: string[];
  scope_names: string[];
  is_active: boolean;
}

/**
 * OidcClient更新用の入力型
 */
export interface OidcClientUpdateInput {
  name: string;
  description?: string;
  allowed_redirect_uris: string[];
  scope_names: string[];
  is_active: boolean;
}

/**
 * WebAuthn資格情報の一覧表示用モデル。
 */
export interface DeviceCredential {
  id: string;
  credential_id: string;
  device_name: string | null;
  user_comment: string | null;
  created_at: string;
}
/**
 * 追加デバイス登録用ワンタイムリンクのレスポンスモデル。
 */
export interface OneTimeLinkCreateResponse {
  token: string;      // ワンタイムリンクのトークン
  url: string;        // ワンタイムリンクのURL
  expires_at: string; // リンクの有効期限（ISO 8601形式）
  message: string;    // リンク発行時のメッセージ（ユーザー向け）
}

/**
 * ワンタイムリンク種別の型定義
 */
export type LinkType = "registration" | "device_registration";

/**
 * ワンタイムリンク取得APIのレスポンスモデル。
 */
export interface OneTimeLinkGetResponse extends OneTimeLinkCreateResponse {
  link_type: LinkType;
}

/**
 * ワンタイムリンク検証レスポンスの型定義
 * backend/app/schemas/one_time_link.py の TokenVerificationResponse に対応
 */
export interface OneTimeLinkVerificationResponse {
  user_id: string;// 検証されたユーザーのID UUID
  email: string;  // 検証されたユーザーのメールアドレス
  status: string; // 検証結果の状態（例: success, pending）
}

/**
 * ユーザーの基本情報の型定義 (backend/app/schemas/user.py の UserOut に対応)
 */
export interface UserProfile {
  id: string;             // UUID
  email: string;          // メールアドレス
  role: "admin" | "user"; // ユーザーの権限レベル
  status: string;          // ユーザーの状態（"pending":ワンタイムリンク生成済み。WebAuthn未登録,"verified":WebAuthn登録済み（認証完了））
  email_verification_status?: string; // APIレスポンス互換用（status未設定時のフォールバック）
}

/**
 * ユーザー作成時の入力データ (backend/app/schemas/user.py の UserCreate に対応)
 */
export interface CreateUserRequest {
  email: string;
  role: "admin" | "user";
}

/**
 * ユーザー更新時の入力データ (backend/app/schemas/user.py の UserUpdate に対応)
 * 更新は任意項目のみを許容するため、Partialな性質を持たせます。
 */
export type UpdateUserRequest = Partial<CreateUserRequest>;

