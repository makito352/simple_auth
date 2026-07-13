/**
 * @file frontend/src/app/devices_add/page.tsx
 * @description 追加デバイス登録用ページ。
 * URLに含まれるワンタイムトークンを検証し、有効な場合はWebAuthnによるデバイス登録フローを開始します。
 */
"use client";

import DeviceAddContent from "@/components/features/register/DeviceAddPage";
/**
 * @component DeviceAddContent
 * @description トークンの検証状態と登録処理を管理するメインコンテンツコンポーネント。
 * 
 * @returns 検証中、エラー時、または成功時の状態に応じたUI。
 */
export default function Page() {
  return <DeviceAddContent />;
}