FROM python:3.11-slim

WORKDIR /app

# system deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ソースコードのコピー
COPY . .

# entrypoint.shをコピーし、実行権限を与える
COPY scripts/entrypoint.sh .
RUN chmod +x entrypoint.sh

# CMDの代わりにENTRYPOINTを使用
ENTRYPOINT ["./entrypoint.sh"]
