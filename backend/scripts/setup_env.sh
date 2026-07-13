#!/bin/bash

# --- OIDC Key Generation ---
# このスクリプトはOIDC用の鍵を生成し、backend/secrets/ に保存します。
# また、.envファイルに貼り付け可能な形式で値を出力します。

echo "--- OIDC Key Generation ---"
mkdir -p backend/secrets
openssl genpkey -algorithm RSA -out backend/secrets/oidc_private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in backend/secrets/oidc_private.pem -pubout -out backend/secrets/oidc_public.pem

echo "OK: OIDC keys saved to [backend/secrets/]"

# --- Additional Keys Generation (Postgres, Encryption, Session) ---
# 追加された3つのキーを生成します。
POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '\n\r')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n\r')
SESSION_TOKEN_SECRET=$(openssl rand -base64 32 | tr -d '\n\r')
INITIAL_ADMIN_USER_PASSWORD=$(openssl rand -base64 32 | tr -d '\n\r')

# --- 結果の出力 ---
echo ""
echo "Security Secret Keys:"
echo "------------------------------------------------------------------------"

echo "POSTGRES_PASSWORD=\"$POSTGRES_PASS\""
echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo "SESSION_TOKEN_SECRET=\"$SESSION_TOKEN_SECRET\""
echo "# 管理者ユーザーの初期パスワード（初期セットアップ時に使用）使用後は空欄コメントアウトしてください。"
echo "INITIAL_ADMIN_USER_PASSWORD=\"$INITIAL_ADMIN_USER_PASSWORD\""

echo ""
echo "------------------------------------------------------------------------"
echo "設定完了！次のステップ："
echo "1. 上記の値を .env ファイルの対応する箇所に貼り付けてください。"
echo "2. TLS証明書のパスを .env 内の適切な場所に指定してください。"
echo "3. docker compose up -d を実行して起動を確認してください。"