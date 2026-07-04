/**
 * ブラウザが最新の JSON 変換メソッドをサポートしているか確認
 */
export const isWebAuthnJsonSupported = !!(
  globalThis.PublicKeyCredential &&
  (PublicKeyCredential as any).parseCreationOptionsFromJSON
);

export async function webauthnRegister(options: any) {
  if (!isWebAuthnJsonSupported) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  try {
    // 1. サーバーから来たJSON（文字列）を、ブラウザが理解できる形式（バイナリ含む）に変換
    console.log("WebAuthn: Parsing Creation Options from JSON");
    const publicKey = (PublicKeyCredential as any).parseCreationOptionsFromJSON(options);
    
    if (!publicKey) {
      throw new Error("Failed to parse creation options from JSON.");
    }

    // 2. 認証器（指紋、顔認証等）を起動
    console.log("WebAuthn: Calling navigator.credentials.create");
    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("No credential was returned from the device.");
    }

    // 3. サーバーに送るために、バイナリをJSON（文字列/Base64）に変換して返す
    console.log("WebAuthn: Converting successful credential to JSON");
    return credential.toJSON();
  } catch (error) {
    console.error("WebAuthn Registration Internal Error:", error);
    throw error; // エラーを上位に投げ、UI側でキャッチできるようにする
  }
}

export async function webauthnLogin(options: any) {
  if (!isWebAuthnJsonSupported) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  try {
    // 1. JSON を内部形式に変換
    console.log("WebAuthn: Parsing Request Options from JSON");
    const publicKey = (PublicKeyCredential as any).parseRequestOptionsFromJSON(options);
    
    if (!publicKey) {
      throw new Error("Failed to parse request options from JSON.");
    }

    // 2. 認証実行
    console.log("WebAuthn: Calling navigator.credentials.get");
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("No credential was retrieved from the device.");
    }

    // 3. JSON に変換して返す
    console.log("WebAuthn: Converting valid login credential to JSON");
    return credential.toJSON();
  } catch (error) {
    console.error("WebAuthn Login Internal Error:", error);
    throw error;
  }
}
