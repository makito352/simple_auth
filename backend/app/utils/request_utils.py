"""
リクエストに関連する情報の解決を行うユーティリティモジュール。
プロキシ経由のIPアドレスの取得などを処理します。
"""

from functools import lru_cache
from ipaddress import ip_address, ip_network

from app.core.config import settings
from fastapi import Request


@lru_cache(maxsize=1)
def _load_trusted_proxy_networks() -> tuple:
    """
    設定から信頼するプロキシIP/CIDR一覧を読み込み、比較用に保持する。
    """
    networks = []
    for raw_value in settings.TRUSTED_PROXY_IPS.split(","):
        candidate = raw_value.strip()
        if not candidate:
            continue

        try:
            networks.append(ip_network(candidate, strict=False))
        except ValueError:
            continue

    return tuple(networks)


def _is_trusted_proxy(request: Request) -> bool:
    """
    接続元が信頼対象のプロキシかどうかを判定する。
    """
    if not settings.TRUST_PROXY_HEADERS:
        return False

    if request.client is None or not request.client.host:
        return False

    try:
        client_ip = ip_address(request.client.host)
    except ValueError:
        return False

    trusted_networks = _load_trusted_proxy_networks()
    return any(client_ip in trusted_network for trusted_network in trusted_networks)


def resolve_client_ip(request: Request) -> str:
    """
    プロキシ配下を考慮してクライアントIPを解決する。
    """
    # 信頼済みプロキシからの転送時のみ X-Forwarded-For を採用する
    if _is_trusted_proxy(request):
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",", maxsplit=1)[0].strip()
            if client_ip:
                return client_ip

    # 直接接続の場合、request.clientからホスト情報を取得
    if request.client is None:
        return "unknown"

    return request.client.host
