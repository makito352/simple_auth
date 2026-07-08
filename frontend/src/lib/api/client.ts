/**
 * @file client.ts
 * @description APIリクエストのための共通クライアントモジュール。
 * fetch APIをラップし、ベースURLの処理、クエリパラメータの付与、
 * 共通ヘッダーの設定などを行い、フロントエンドからバックエンドへの通信を簡略化します。
 */

/**
 * クエリパラメータをURLに付与し、適切なベースURLを組み合わせて完全なURLを生成する。
 * サーバーサイド実行時とクライアントサイド実行時で異なる接続先（内部ネットワーク vs 外部公開用）を判別します。
 * 
 * @param path - リクエスト先のパス（例: "/api/users"）
 * @param params - URLに付与するクエリパラメータのオブジェクト
 * @returns 生成された完全なURL文字列
 */
export function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  // サーバーサイド実行時かどうかを判定（Next.jsの環境変数を利用）
  const isServer = typeof window === 'undefined';
  
  // 内部ネットワーク用のホスト名 (Docker Composeのサービス名)
  const internalHost = process.env.BACKEND_INTERNAL_URL || "http://backend:8000"; 
  // 外部公開用またはクライアントからのリクエスト用
  const externalHost = process.env.NEXT_PUBLIC_API_URL;

  let baseUrl = isServer ? internalHost : externalHost;

  if (!baseUrl) {
    console.error("Base URL is not defined");
  }

  // pathが / で始まっているか確認し、適切に結合（重複するスラッシュを防止）
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  let url = `${baseUrl}/${cleanPath}`;

  // パラメータが存在する場合のみクエリ文字列を付加
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    url += `?${queryString}`;
  }
  return url;
}

/**
 * fetch APIをラップした共通の通信処理を行う。
 * ステータスコードのチェック、レスポンスのパース、204 No Contentへの対応を行います。
 * 
 * @param url - リクエスト先のURL
 * @param options - fetchオプション（メソッド、ヘッダー等）
 * @returns 解析済みのJSONデータまたはnull
 */
async function request(url: string, options: RequestInit): Promise<any> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.error("NEXT_PUBLIC_API_URL is not defined");
  }

  const res = await fetch(url, options);

  // 成功ステータス（200-299）以外の場合はエラーを投げる
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  // ステータスが204の場合は中身がないためnullを返す
  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  // レスポンスボディがある場合のみJSONとしてパース
  return text ? JSON.parse(text) : null;
}

/**
 * POSTリクエストを実行する。
 * 
 * @param path - リクエストパス
 * @param body - JSONとして送信するデータ（任意）
 */
export async function apiPost(path: string, body?: any) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  return request(url, options);
}

/**
 * PUTリクエストを実行する。
 * 
 * @param path - リクエストパス
 * @param body - 更新用データ（任意）
 */
export async function apiPut(path: string, body?: any) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  return request(url, options);
}

/**
 * FormDataを伴うPOSTリクエストを実行する（例：ファイルアップロード）。
 * 
 * @param path - リクエストパス
 * @param formData - FormDataオブジェクト
 */
export async function apiPostForm(path: string, formData: FormData) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "POST",
    credentials: "include",
    body: formData, // FormDataの場合、Content-Typeヘッダーはブラウザにより自動設定されるため指定しない
  };
  return request(url, options);
}

/**
 * FormDataを伴うPUTリクエストを実行する。
 * 
 * @param path - リクエストパス
 * @param formData - FormDataオブジェクト
 */
export async function apiPutForm(path: string, formData: FormData) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "PUT",
    credentials: "include",
    body: formData,
  };
  return request(url, options);
}

/**
 * PATCHリクエストを実行する。
 * 
 * @param path - リクエストパス
 * @param body - 更新用データ（任意）
 */
export async function apiPatch(path: string, body?: any) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  return request(url, options);
}

/**
 * GETリクエストを実行する。
 * 
 * @param path - リクエストパス
 * @param params - クエリパラメータ（任意）
 */
export async function apiGet(path: string, params?: Record<string, string | number | boolean>) {
  const url = buildUrl(path, params);
  const options: RequestInit = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  return request(url, options);
}

/**
 * DELETEリクエストを実行する。
 * 
 * @param path - リクエストパス
 */
export async function apiDelete(path: string) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  return request(url, options);
}