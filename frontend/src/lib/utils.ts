/**
 * ユーティリティ関数の定義
 */

/**
 * 入力された文字列が有効なメールアドレス形式であるかを確認します。
 * 
 * @param email - 検証するメールアドレスの文字列
 * @returns 有効な形式であればtrue、そうでなければfalseを返します。
 */
export const validateEmail = (email: string): boolean => {
  // 基本的なメールアドレスの構造（@および.を含むか）をチェック
  return /\S+@\S+\.\S+/.test(email);
};