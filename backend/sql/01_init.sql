-- ============================
-- SimpleAuth 初期スキーマ
-- ============================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------
-- users
-- ----------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_verification_status TEXT NOT NULL DEFAULT 'pending',
    email TEXT NOT NULL UNIQUE,
    email_verified_at TIMESTAMPTZ,
    email_verification_expires_at TIMESTAMPTZ,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------
-- user_option_attributes (OIDCの返却項目)
-- ----------------------------
CREATE TABLE user_option_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,                       -- 例: "imap_server"
    encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(key)
);

-- ----------------------------
-- user_option (OIDCのユーザ毎の設定値)
-- ----------------------------
CREATE TABLE user_option (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,                       -- 例: "imap_server"
    value TEXT,                              -- encrypted=falseの場合
    encrypted_value JSONB,                   -- encrypted=trueの場合
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- ----------------------------
-- dashboard_links(ダッシュボードのリンク)
-- ----------------------------
CREATE TABLE dashboard_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,                     -- 表示名
    url TEXT NOT NULL,                       -- アクセス先URL
    icon_path TEXT,                          -- アイコンのパス
    order_index INTEGER NOT NULL DEFAULT 0,  -- 並び順
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- ----------------------------
-- -- otp_codes (メール認証用)
-- -- ----------------------------
-- CREATE TABLE otp_codes (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     code VARCHAR(6) NOT NULL,
--     expires_at TIMESTAMPTZ NOT NULL,
--     used_at TIMESTAMPTZ,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- CREATE INDEX idx_otp_user_id ON otp_codes(user_id);
-- CREATE INDEX idx_otp_expires_at ON otp_codes(expires_at);

-- ----------------------------
-- one_time_links (管理画面から発行するワンタイムアクセスURL用)
-- ----------------------------
CREATE TABLE one_time_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,              -- URLに含まれる一意のトークン
    type TEXT NOT NULL,                     -- "registration", "reset"
    expires_at TIMESTAMPTZ NOT NULL,       -- 有効期限
    used_at TIMESTAMPTZ,                   -- 使用済みフラグ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_one_time_links_token ON one_time_links(token);
CREATE INDEX idx_one_time_links_user_id ON one_time_links(user_id);

-- ----------------------------
-- registration_sessions (メールアドレス登録→OTP認証→webauthn登録までのセッション管理)
-- ----------------------------
CREATE TABLE registration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    challenge bytea,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_registration_sessions_user_id ON registration_sessions(user_id);

-- ----------------------------
-- authentication_options (ログイン時のchallenge管理)
-- ----------------------------
CREATE TABLE authentication_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT NOT NULL,
    challenge bytea NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_authentication_options_session_token ON authentication_options(session_token);

-- ----------------------------
-- credentials (WebAuthn)
-- ----------------------------
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NULL UNIQUE,
    public_key TEXT NOT NULL,
    sign_count INTEGER NOT NULL DEFAULT 0,
    device_name TEXT,
    user_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credentials_user_id ON credentials(user_id);

-- ----------------------------
-- sessions (ログインセッション)
-- ----------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ----------------------------
-- oidc_auth_codes (OIDC認証コード)
-- ----------------------------
CREATE TABLE oidc_auth_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) NOT NULL UNIQUE,
    client_id VARCHAR(255) NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oidc_auth_codes_code ON oidc_auth_codes(code);
CREATE INDEX idx_oidc_auth_codes_user_id ON oidc_auth_codes(user_id);

-- ----------------------------
-- oidc_access_tokens (OIDCアクセストークン)
-- ----------------------------
CREATE TABLE oidc_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oidc_access_tokens_token ON oidc_access_tokens(token);
CREATE INDEX idx_oidc_access_tokens_user_id ON oidc_access_tokens(user_id);

-- ----------------------------
-- oidc_refresh_tokens (OIDCリフレッシュトークン)
-- ----------------------------
CREATE TABLE oidc_refresh_tokens (
    token TEXT PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL REFERENCES oidc_clients(client_id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oidc_refresh_tokens_client_id ON oidc_refresh_tokens(client_id);
CREATE INDEX idx_oidc_refresh_tokens_user_id ON oidc_refresh_tokens(user_id);
CREATE INDEX idx_oidc_refresh_tokens_expires_at ON oidc_refresh_tokens(expires_at);

-- ----------------------------
-- oidc_clients (OIDCクライアントの基本情報)
-- ----------------------------
CREATE TABLE oidc_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                    -- 管理画面に表示するアプリ名
    client_id TEXT NOT NULL UNIQUE,          -- アプリ側で識別するID
    client_secret TEXT NOT NULL,            -- 暗号化されたシークレット（またはハッシュ）
    description TEXT,                       -- 管理画面等に表示される「アプリの備考」
    allowed_redirect_uris TEXT[] NOT NULL, -- 許可されたリダイレクトURLのリスト
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------
-- oidc_scopes (定義済みのスコープ一覧)
-- ----------------------------
CREATE TABLE oidc_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_name TEXT NOT NULL UNIQUE,        -- 例: "imap", "profile"
    description TEXT,                       -- スコープの説明（何ができるか）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------
-- oidc_auth_codes (OIDCクレームマッピング)
-- ----------------------------
CREATE TABLE oidc_claim_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope TEXT NOT NULL REFERENCES oidc_scopes(scope_name) ON DELETE CASCADE, -- 例: "imap"
    claim_name TEXT NOT NULL,                -- 例: "imap_server"
    value_source TEXT NOT NULL,              -- "user_attribute" / "static" / "user_field"
    value_key TEXT,                          -- user_attribute の key など
    static_value TEXT,                       -- value_source=static の場合
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------
-- oidc_client_scopes (クライアントとスコープの紐付け)
-- ※ user_option_attributes とは別に、システム的な権限設計として分離します。
-- ----------------------------
CREATE TABLE oidc_client_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id TEXT NOT NULL REFERENCES oidc_clients(client_id) ON DELETE CASCADE,
    scope_name TEXT NOT NULL REFERENCES oidc_scopes(scope_name) ON DELETE CASCADE,
    UNIQUE(client_id, scope_name)
);

-- ----------------------------
-- oidc_scopes 初期データ
-- ----------------------------
INSERT INTO oidc_scopes (scope_name, description)
VALUES
    ('openid', 'OpenID Connect の必須スコープ'),
    ('profile', 'ユーザープロファイル情報の参照'),
    ('email', 'ユーザーのメール情報の参照'),
    ('offline_access', 'リフレッシュトークンの発行を許可（オフラインでのアクセス権限）')
ON CONFLICT (scope_name) DO NOTHING;