/**
 * @file frontend/src/lib/api/webauthn.ts
 * @description WebAuthn認証のAPI連携用モジュール
 * サーバーとの通信とブラウザによる生体認証の橋渡しを行います。
 */
"use client";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import { detectClientOs,webauthnLogin, webauthnRegister } from "@/lib/webauthn";

import { apiPost } from "./client";

/**
 * ログインオプション取得APIのレスポンス型。
 */
type LoginOptionsResponse = {
  options: PublicKeyCredentialRequestOptionsJSON;
};

/**
 * WebAuthnを使用したデバイス登録フローを実行します。
 * 
 * 処理の流れ:
 * 1. サーバーから認証用オプション（チャレンジ等）を取得
 * 2. ブラウザの生体認証を用いて、秘密鍵と公開鍵のペアを作成・登録
 * 3. 生成された認証情報を元に、OS情報を含めてサーバーへ送付し、デバイスとして登録。
 * @returns サーバーからの最終的な登録成功レスポンス
 */
export async function registerWebAuthnDevice() {
  // 1. サーバーからオプションを取得
  const options = (await apiPost("/webauthn/register/options")) as PublicKeyCredentialCreationOptionsJSON;

  // 2. ブラウザの生体認証を実行（この時、ユーザーは指紋や顔認証を行う）
  const cred = (await webauthnRegister(options)) as RegistrationResponseJSON;
  if (!cred) {
    throw new Error("Credential is null or undefined");
  }

  // 3. 検証用ペイロードを構築（サーバー側でOSの種類を識別できるようにデバイス名を付与）
  const verifyPayload = {
    ...cred,
    device_name: detectClientOs(),
  };

  // 4. サーバーで最終的な検証を実行
  return await apiPost("/webauthn/register/verify", verifyPayload);
}

/**
 * WebAuthnを使用したログインフローを実行します。
 * 
 * 処理の流れ:
 * 1. サーバーから認証用オプションを取得
 * 2. ブラウザの生体認証によって「誰であるか」を証明
 * 3. 検証結果とともにサーバーへ送信し、セッションを開始する。
 */
export async function performWebAuthnLogin() {
  // 1. サーバーからオプション（チャレンジ含む）を取得
  const response = (await apiPost("/webauthn/login/options")) as LoginOptionsResponse;
  const webauthnOptions = response.options;

  // 2. ブラウザの生体認証を実行
  const cred = await webauthnLogin(webauthnOptions);

  // 3. 検証APIを叩く（session_tokenはHttpOnly Cookieで自動的に付与される）
  await apiPost("/webauthn/login/verify", cred);
}

/**
 * WebAuthnセッションおよび関連するクッキーのクリアを行います。
 * バックエンドの /webauthn/logout エンドポイントを呼び出します。
 */
export async function logout(): Promise<void> {
  // backendが204（No Content）を返す場合、apiPostはnullを返すが、
  // 意図した動作としてPromise<void>として定義しています。
  await apiPost("/webauthn/logout");
}