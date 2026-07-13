/**
 * @file typescript frontend/src/components/features/admin/oidc-clients/components/table-header.tsx
 * @description OIDCクライアント一覧テーブルのヘッダー定義
 * 管理画面におけるOIDCクライアント情報の表示項目を定義します。
 */

import React from 'react';

/**
 * OIDCクライアント一覧のテーブルヘッダーコンポーネント
 * 各列のタイトルと、必要に応じて補足説明（サブテキスト）を表示します。
 * 
 * @returns テーブルのthead要素
 */
export const ClientTableHeader = () => (
  <thead className="bg-gray-50">
    <tr>
      {/* アプリケーションの識別名 */}
      <th className="p-3 border-b">アプリ名</th>
      {/* システム上のID（Client ID） */}
      <th className="p-3 border-b">client_id</th>
      {/* 機密情報。セキュリティのためマスク表示が標準となります */}
      <th className="p-3 border-b">
        client_secret
        <div className="text-xs font-normal text-gray-500 mt-1">マスク表示のみ（再表示不可）</div>
      </th>
      {/* 許可されているスコープの範囲 */}
      <th className="p-3 border-b">scope</th>
      {/* 現在のステータス（有効/無効など） */}
      <th className="p-3 border-b">状態</th>
      {/* 更新、削除などのアクションボタン用項目 */}
      <th className="p-3 border-b">操作</th>
    </tr>
  </thead>
);