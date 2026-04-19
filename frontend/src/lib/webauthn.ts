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

  // 1. サーバーから来たJSON（文字列）を、ブラウザが理解できる形式（バイナリ含む）に変換
  const publicKey = (PublicKeyCredential as any).parseCreationOptionsFromJSON(options);

  // 2. 認証器（指紋、顔認証等）を起動
  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential;

  // 3. サーバーに送るために、バイナリをJSON（文字列/Base64）に変換して返す
  return credential.toJSON();
}

export async function webauthnLogin(options: any) {
  if (!isWebAuthnJsonSupported) {
    throw new Error("Your browser does not support the latest WebAuthn JSON API.");
  }

  // 1. JSON を内部形式に変換
  const publicKey = (PublicKeyCredential as any).parseRequestOptionsFromJSON(options);

  // 2. 認証実行
  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential;

  // 3. JSON に変換して返す
  return credential.toJSON();
}
