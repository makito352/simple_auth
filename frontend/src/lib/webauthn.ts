/**
 * ブラウザが最新の JSON 変換メソッドをサポートしているか確認
 */
import { logger } from "@/lib/logger";

export const isWebAuthnJsonSupported = !!(
  globalThis.PublicKeyCredential &&
  (PublicKeyCredential as any).parseCreationOptionsFromJSON
);

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

const OS_NAME_MAP: Record<string, string> = {
  windows: "Windows",
  ios: "iOS",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  unknown: "Unknown",
};

/**
 * ブラウザのクライアント情報から保存用のOS名を推定する
 */
export function detectClientOs(): string {
  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
  const userAgentDataPlatform = navigatorWithUserAgentData.userAgentData?.platform ?? "";
  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  const normalizedSources = [userAgentDataPlatform, platform, userAgent].join(" ").toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  if (normalizedSources.includes("iphone") || normalizedSources.includes("ipad") || normalizedSources.includes("ipod")) {
    return OS_NAME_MAP.ios;
  }

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

export async function webauthnRegister(options: any) {
  if (!isWebAuthnJsonSupported) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  try {
    // 1. サーバーから来たJSON（文字列）を、ブラウザが理解できる形式（バイナリ含む）に変換
    logger.debug("WebAuthn: Parsing Creation Options from JSON");
    const publicKey = (PublicKeyCredential as any).parseCreationOptionsFromJSON(options);
    
    if (!publicKey) {
      throw new Error("Failed to parse creation options from JSON.");
    }

    // 2. 認証器（指紋、顔認証等）を起動
    logger.debug("WebAuthn: Calling navigator.credentials.create");
    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("No credential was returned from the device.");
    }

    // 3. サーバーに送るために、バイナリをJSON（文字列/Base64）に変換して返す
    logger.debug("WebAuthn: Converting successful credential to JSON");
    return credential.toJSON();
  } catch (error) {
    logger.error(`WebAuthn Registration Internal Error: ${error}`);
    throw error; // エラーを上位に投げ、UI側でキャッチできるようにする
  }
}

export async function webauthnLogin(options: any) {
  if (!isWebAuthnJsonSupported) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  try {
    // 1. JSON を内部形式に変換
    logger.debug("WebAuthn: Parsing Request Options from JSON");
    const publicKey = (PublicKeyCredential as any).parseRequestOptionsFromJSON(options);
    
    if (!publicKey) {
      throw new Error("Failed to parse request options from JSON.");
    }

    // 2. 認証実行
    logger.debug("WebAuthn: Calling navigator.credentials.get");
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("No credential was retrieved from the device.");
    }

    // 3. JSON に変換して返す
    logger.debug("WebAuthn: Converting valid login credential to JSON");
    return credential.toJSON();
  } catch (error) {
    logger.error(`WebAuthn Login Internal Error: ${error}`);
    throw error;
  }
}
