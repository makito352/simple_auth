#!/bin/bash

# --- OIDC Key Generation ---
# このスクリプトはOIDC用の鍵を生成し、.envファイルに貼り付け可能な形式で出力します。

echo "--- OIDC Key Generation ---"

# 一時ファイルの作成（後で削除）
TMP_PRIV=$(mktemp)
TMP_PUB=$(mktemp)

# 1. プライベートキーの生成 (DER形式)
# 「ecparam」や「x509」を組み合わせるのではなく、
# 最も標準的なパスをたどってプライベート鍵（DER）を取得します。
# ※-no1などの特殊なフラグを除去し、汎用性を高めます。
openssl ecparam -name prime256v1 -genkey -outform DER > "$TMP_PRIV" 2>/dev/null

# もし上記コマンドが環境によって失敗する場合のための予備策（OpenSSL 3.x等に対応）
if [ ! -s "$TMP_PRIV" ]; then
    openssl genpkey -algorithm EC -pkeyfn EC -pkey_parameters EC_PARAM_prime256v1 -outform DER > "$TMP_PRIV" 2>/dev/null
fi

# 2. パブリックキーの抽出 (DER形式)
# プライベート鍵からパブリック鍵を抽出し、DER形式で出力します。
openssl ec -inform DER -pubout -outform DER -in "$TMP_PRIV" > "$TMP_PUB" 2>/dev/null

# 3. Base64に変換（改行なし）
# .envファイルで読み込む際に問題が出ないよう、base64のラップを解除します。
# 環境によって base64 -w 0 が動かない場合を考慮し、tr で改行を除去する処理も入れます。
PRIVATE_KEY_RAW=$(base64 -w 0 < "$TMP_PRIV" | tr -d '\n\r')
PUBLIC_KEY_RAW=$(base64 -w 0 < "$TMP_PUB" | tr -d '\n\r')

# 一時ファイルの削除
rm -f "$TMP_PRIV" "$TMP_PUB"

# --- Additional Keys Generation (Postgres, Encryption, Session) ---
# 追加された3つのキーを生成します。
POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '\n\r')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n\r')
SESSION_TOKEN_SECRET=$(openssl rand -base64 32 | tr -d '\n\r')


# --- 結果の出力 ---
echo ""
echo "以下の内容を .env ファイルの該当箇所にコピー＆ペーストしてください。"
echo "------------------------------------------------------------------------"

echo "OIDC_JWT_PRIVATE_KEY=\"$PRIVATE_KEY_RAW\""
echo "OIDC_JWT_PUBLIC_KEY=\"$PUBLIC_KEY_RAW\""


echo ""
echo "Security Secret Keys:"
echo "------------------------------------------------------------------------"

echo "POSTGRES_PASSWORD=\"$POSTGRES_PASS\""
echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo "SESSION_TOKEN_SECRET=\"$SESSION_TOKEN_SECRET\""

echo ""
echo "------------------------------------------------------------------------"
echo "完了しました。上記の値を .env に反映させてください。"