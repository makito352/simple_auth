import { apiPost } from "./client";
import { webauthnLogin, webauthnRegister, detectClientOs  } from "@/lib/webauthn"; // 認証用ヘルパー

/**
 * WebAuthnを使用したデバイス登録フローを実行する。
 * 1. サーバーからオプションを取得
 * 2. ブラウザで生体認証（WebAuthn）を実行
 * 3. 検証用リクエストをサーバーへ送信し、デバイス名を付与する
 */
export async function registerWebAuthnDevice() {
  // 1. サーバーからオプションを取得
  const options = await apiPost("/webauthn/register/options");

  // 2. ブラウザの生体認証を実行
  const cred = await webauthnRegister(options);
  if (!cred) {
    throw new Error("Credential is null or undefined");
  }

  // 3. 検証用ペイロードを構築（OS名を付与）
  const verifyPayload = {
    ...cred,
    device_name: detectClientOs(),
  };

  // 4. サーバーで検証を実行
  return await apiPost("/webauthn/register/verify", verifyPayload);
}

/**
 * WebAuthnを使用した認証フローを実行する。
 * 1. サーバーからオプションを取得
 * 2. ブラウザで生体認証（WebAuthn）を実行
 * 3. 検証用リクエストを送信
 */
export async function performWebAuthnLogin() {
  // 1. サーバーからオプション（チャレンジ含む）を取得
  const response = await apiPost("/webauthn/login/options");
  const webauthnOptions = response.options;
  const sessionToken = response.session_token;

  // 2. ブラウザの生体認証を実行
  const cred = await webauthnLogin(webauthnOptions);

  // 3. 検証APIを叩く
  await apiPost("/webauthn/login/verify", {
    ...cred,
    session_token: sessionToken,
  });
}

/**
 * ユーザーをログアウトする。
 * バックエンドの /webauthn/logout を呼び出す。
 */
export async function logout(): Promise<void> {
  // backendが204を返すため、apiPost(または内部のrequest)はnullを返すが
  // 型定義としてvoid（何も返さない）として扱うのが適切です。
  await apiPost("/webauthn/logout");
}