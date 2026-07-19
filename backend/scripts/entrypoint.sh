#!/bin/bash
set -e

# Pythonが現在のディレクトリをモジュール検索パスとして認識できるようにする
export PYTHONPATH=$PYTHONPATH:/app/app

# マイグレーションを実行
echo "Running database migrations..."
alembic upgrade head

# アプリケーションを起動（execを使うことでPID 1を維持）
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000