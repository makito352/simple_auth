#!/bin/sh

echo "--- Nginx Configuration Generation ---"
echo "SSL_CERTIFICATE_PATH: $SSL_CERTIFICATE_PATH"
echo "SSL_CERTIFICATE_KEY_PATH: $SSL_CERTIFICATE_KEY_PATH"
echo "SERVER_HOSTNAME: $SERVER_HOSTNAME"

# 変数リスト
VARS="\${SSL_CERTIFICATE_PATH} \${SSL_CERTIFICATE_KEY_PATH} \${SERVER_HOSTNAME}"

# 処理対象のファイルを個別にループで回す、またはシンプルに記述する
# /bin/sh (dash) でも動作するように修正
for FILE in "/etc/nginx/nginx.conf.base" \
             "/etc/nginx/conf.d/main.conf.base" \
             "/etc/nginx/conf.d/photoprism.conf.base" \
             "/etc/nginx/conf.d/roundcube.conf.base"; do

    if [ ! -f "$FILE" ]; then
        echo "エラー: ファイルが見つかりません -> $FILE" >&2
    else
        echo "処理中: $FILE"
        # 出力先パスの決定（.base を . に置換）
        OUT_FILE=$(echo "$FILE" | sed 's/\.base$//')
        
        # debug用の出力
        # echo "debug : envsubst $VARS < $FILE > $OUT_FILE"

        # envsubstを使用して、環境変数を置換し、出力先ファイルに書き込む
        envsubst "$VARS" < "$FILE" > "$OUT_FILE"
    fi
done