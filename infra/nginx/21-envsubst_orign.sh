#/bin/sh 

envsubst '$$SSL_CERTIFICATE_PATH $$SSL_CERTIFICATE_KEY_PATH $$SERVER_HOSTNAME'< /etc/nginx/nginx_simpleauth_base > /etc/nginx/nginx.conf
