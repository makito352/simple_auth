/**
 * WebAuthn (FIDO2) 関連のブラウザ操作用ユーティリティ
 * 
 * このモジュールは、WebAuthn APIとフロントエンド間のデータやり取りを橋渡しします。
 * 特に、バイナリデータを扱うWebAuthnのネイティブ仕様をJSON形式に変換する処理を含みます。
 */

import { logger } from "@/lib/logger";

/**
 * 最新の WebAuthn JSON 変換メソッド（parseCreationOptionsFromJSON, parseRequestOptionsFromJSON）
 * の存在を確認するための型定義。
 */
type WebAuthnJsonPublicKeyCredentialConstructor = {
  parseCreationOptionsFromJSON: (options: unknown) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON: (options: unknown) => PublicKeyCredentialRequestOptions;
};

/**
 * ブラウザが最新の WebAuthn JSON 変換 API をサポートしているか確認する。
 * モダンなブラウザでは、サーバーから送られてくるJSONを直接処理するためのメソッドを提供しています。
 * @returns サポートしていればオブジェクト、さもなければ null を返します。
 */
function getWebAuthnJsonConstructor(): WebAuthnJsonPublicKeyCredentialConstructor | null {
  if (!globalThis.PublicKeyCredential) {
    return null;
  }

  const maybeWebAuthnJsonApi = globalThis.PublicKeyCredential as unknown as Partial<WebAuthnJsonPublicKeyCredentialConstructor>;
  if (typeof maybeWebAuthnJsonApi.parseCreationOptionsFromJSON !== "function") {
    return null;
  }

  if (typeof maybeWebAuthnJsonApi.parseRequestOptionsFromJSON !== "function") {
    return null;
  }

  return maybeWebAuthnJsonApi as WebAuthnJsonPublicKeyCredentialConstructor;
}

/**
 * ブラウザが最新の JSON 変換メソッドをサポートしているか判定。
 */
export const isWebAuthnJsonSupported = getWebAuthnJsonConstructor() !== null;

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

/**
 * OS識別用のマッピングテーブル
 */
const OS_NAME_MAP: Record<string, string> = {
  windows: "Windows",
  ios: "iOS",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  unknown: "Unknown",
};

/**
 * ブラウザのクライアント情報（UserAgent, Platform等）から、
 * 保存用に使用するOS名を特定します。
 * 
 * @returns 推定されたOS名（例: "iOS", "Android", "Windows" 等）
 */
export function detectClientOs(): string {
  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
  const userAgentDataPlatform = navigatorWithUserAgentData.userAgentData?.platform ?? "";
  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  const normalizedSources = [userAgentDataPlatform, platform, userAgent].join(" ").toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  // iOSデバイスの判定（iPhone, iPad等）
  if (normalizedSources.includes("iphone") || normalizedSources.includes("ipad") || normalizedSources.includes("ipod")) {
    return OS_NAME_MAP.ios;
  }

  // マルチタッチ対応MacBook等の判定（iPadOSとの識別用）
  if (
    normalizedSources.includes("macintosh") &&
    maxTouchPoints > 1
  ) {
    return OS_NAME_MAP.ios;
  }

  if (normalizedSources.includes("android")) {
    return OS_NAME_MAP.android;
  }

  if (normalizedSources.includes("win")) {
    return OS_NAME_MAP.windows;
  }

  if (normalizedSources.includes("mac os") || normalizedSources.includes("macintosh") || normalizedSources.includes("macintel")) {
    return OS_NAME_MAP.macos;
  }

  if (normalizedSources.includes("linux") || normalizedSources.includes("x11")) {
    return OS_NAME_MAP.linux;
  }

  return OS_NAME_MAP.unknown;
}

/**
 * 新規デバイス登録のためのWebAuthn認証を実行します。
 * 
 * @param options - サーバーから提供された「Registration Options」のJSONオブジェクト
 * @throws エラーの場合はログを記録し、上位へ再送出します。
 */
export async function webauthnRegister(options: unknown) {
  const webAuthnJsonApi = getWebAuthnJsonConstructor();
  if (!webAuthnJsonApi) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  try {
    // 1. サーバーから来たJSON（文字列/Base64）を、ブラウザが理解できる内部形式に変換
    logger.debug("WebAuthn: Parsing Creation Options from JSON");
    const publicKey = webAuthnJsonApi.parseCreationOptionsFromJSON(options);
    
    if (!publicKey) {
      throw new Error("Failed to parse creation options from JSON.");
    }

    // 2. ブラウザのネイティブ機能を使用して認証器（指紋、FaceID等）を起動
    logger.debug("WebAuthn: Calling navigator.credentials.create");
    const credential = await navigator.credentials.create({
      publicKey,
    });

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error("No credential was returned from the device.");
    }

    // 3. ブラウザが生成したバイナリ情報を、再度JSON（Base64等）に変換して返却
    logger.debug("WebAuthn: Converting successful credential to JSON");
    return credential.toJSON();
  } catch (error) {
    logger.error(`WebAuthn Registration Internal Error: ${error}`);
    throw error;
  }
}

/**
 * 既存のデバイスによるログイン認証を実行します。
 * 
 * @param options - サーバーから提供された「Authentication Request」のJSONオブジェクト
 * @throws エラーの場合はログを記録し、上位へ再送出します。
 */
export async function webauthnLogin(options: unknown) {
  const webAuthnJsonApi = getWebAuthnJsonConstructor();
  if (!webAuthnJsonApi) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  try {
    // 1. 送信されたJSONを内部的な認証要求に変換
    logger.debug("WebAuthn: Parsing Request Options from JSON");
    const publicKey = webAuthnJsonApi.parseRequestOptionsFromJSON(options);
    
    if (!publicKey) {
      throw new Error("Failed to parse request options from JSON.");
    }

    // 2. ブラウザの認証を要求（実際に指紋などの生体認証ダイアログが出る）
    logger.debug("WebAuthn: Calling navigator.credentials.get");
    const credential = await navigator.credentials.get({
      publicKey,
    });

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error("No credential was retrieved from the device.");
    }

    // 3. 結果をJSON形式に変換してサーバーへ送信可能な状態にする
    logger.debug("WebAuthn: Converting valid login credential to JSON");
    return credential.toJSON();
  } catch (error) {
    logger.error(`WebAuthn Login Internal Error: ${error}`);
    throw error;
  }
}
