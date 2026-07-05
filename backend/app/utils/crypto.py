"""
暗号化・復号に関するユーティリティ関数。
"""

from app.core.config import logger, settings
from cryptography.fernet import Fernet

# 設定ファイルから読み込んだキーを使用して暗号化・復号用のインスタンスを生成
cipher_suite = Fernet(settings.ENCRYPTION_KEY)


def encrypt_value(value: str) -> str:
    """
    値を暗号化します。

    Args:
        value (str): 平文の文字列
    Returns:
        str: 暗号化された後のベース64エンコード済み文字列
    """
    if not value:
        return ""
    return cipher_suite.encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    """
    暗号化された値を復号します。

    Args:
        encrypted_value (str): 暗号化されたベース64エンコード文字列
    Returns:
        str: 復号された平文
    """
    if not encrypted_value:
        return ""
    try:
        return cipher_suite.decrypt(encrypted_value.encode()).decode()
    except Exception as e:
        # 復号に失敗した場合はログを出力し、元の値を返さず例外を発生させる
        logger.error(
            f"Decryption failed for value: {encrypted_value[:50]}... Error: {e}"
        )
        raise ValueError(
            "Failed to decrypt the value. The key might be invalid or the data is corrupted."
        ) from e
