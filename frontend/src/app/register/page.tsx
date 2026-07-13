/**
 * @file frontend/src/app/register/page.tsx
 * @description 新規ユーザーのWebAuthnデバイス登録ページ（サーバーエントリ）。
 */

import RegisterClient from "@/components/features/register/RegisterClient";

/**
 * registerページで受け取るsearchParams型。
 */
type RegisterPageSearchParams = {
  token?: string | string[];
};

/**
 * registerページの入力プロパティ。
 */
type RegisterPageProps = {
  searchParams?: RegisterPageSearchParams | Promise<RegisterPageSearchParams>;
};

/**
 * 通常登録ページ。
 * Server Componentでqueryを受け取り、Client Componentへ必要値のみを受け渡す。
 */
export default async function WebAuthnRegPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tokenParam = resolvedSearchParams?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam ?? null;

  return <RegisterClient token={token} />;
}