-- ============================
-- SimpleAuth 追加スキーマ(明示的に別ファイルにしておく)
-- ============================

-- ----------------------------
-- oidc_refresh_tokens (OIDCリフレッシュトークン)
-- ----------------------------
CREATE TABLE IF NOT EXISTS oidc_refresh_tokens (
    token TEXT PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL REFERENCES oidc_clients(client_id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_client_id ON oidc_refresh_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_user_id ON oidc_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_expires_at ON oidc_refresh_tokens(expires_at);

-- ----------------------------
-- oidc_scopes 初期データ+リフレッシュトークン
-- ----------------------------
INSERT INTO oidc_scopes (scope_name, description)
VALUES
    ('offline_access', 'リフレッシュトークンの発行を許可（オフラインでのアクセス権限）')
ON CONFLICT (scope_name) DO NOTHING;