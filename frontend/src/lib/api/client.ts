/**
 * クエリパラメータをURLに付与するヘルパー関数
 */
// function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
//   let url = `${process.env.NEXT_PUBLIC_API_URL}${path}`;
//   if (params && Object.keys(params).length > 0) {
//     const queryString = new URLSearchParams(params as Record<string, string>).toString();
//     url += `?${queryString}`;
//   }
//   return url;
// }
export function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  // サーバーサイド実行時かどうかを判定（Next.jsの環境変数を利用）
  const isServer = typeof window === 'undefined';
  
  // 内部ネットワーク用のホスト名 (Docker Composeのサービス名)
  const internalHost = "http://backend:8000"; 
  // 外部公開用またはクライアントからのリクエスト用
  const externalHost = process.env.NEXT_PUBLIC_API_URL;

  let baseUrl = isServer ? internalHost : externalHost;

  if (!baseUrl) {
    console.error("Base URL is not defined");
  }

  // pathが / で始まっているか確認し、適切に結合
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  let url = `${baseUrl}/${cleanPath}`;

  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    url += `?${queryString}`;
  }
  return url;
}

/**
 * 共通のfetch処理を行う内部関数
 */
async function request(url: string, options: RequestInit): Promise<any> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.error("NEXT_PUBLIC_API_URL is not defined");
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * POSTリクエスト用の関数
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
 * PUTリクエスト用の関数
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
 * POST multipart/form-data の関数
 */
export async function apiPostForm(path: string, formData: FormData) {
  const url = buildUrl(path);
  const options: RequestInit = {
    method: "POST",
    credentials: "include",
    body: formData,
  };
  return request(url, options);
}

/**
 * PUT multipart/form-data の関数
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
 * PATCHリクエスト用の関数
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
 * GETリクエスト用の関数
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
 * DELETEリクエスト用の関数
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
