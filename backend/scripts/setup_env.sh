#!/bin/bash

# --- OIDC Key Generation ---
# このスクリプトはOIDC用の鍵を生成し、.envファイルに貼り付け可能な形式で出力します。

echo "--- OIDC Key Generation ---"
mkdir -p backend/secrets
openssl ecparam -name prime256v1 -genkey -noout -out backend/secrets/oidc_private.pem
openssl ec -in backend/secrets/oidc_private.pem -pubout -out backend/secrets/oidc_public.pem

# --- Additional Keys Generation (Postgres, Encryption, Session) ---
# 追加された3つのキーを生成します。
POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '\n\r')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n\r')
SESSION_TOKEN_SECRET=$(openssl rand -base64 32 | tr -d '\n\r')


# --- 結果の出力 ---
echo ""
echo "Security Secret Keys:"
echo "------------------------------------------------------------------------"

echo "POSTGRES_PASSWORD=\"$POSTGRES_PASS\""
echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo "SESSION_TOKEN_SECRET=\"$SESSION_TOKEN_SECRET\""

echo ""
echo "------------------------------------------------------------------------"
echo "完了しました。上記の値を .env に反映させてください。"