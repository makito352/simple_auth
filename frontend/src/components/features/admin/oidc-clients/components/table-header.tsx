import React from "react";

/**
 * OIDCクライアント一覧のテーブルヘッダー
 */
export const ClientTableHeader = () => (
  <thead className="bg-gray-50">
    <tr>
      <th className="p-3 border-b">アプリ名</th>
      <th className="p-3 border-b">client_id</th>
      <th className="p-3 border-b">
        client_secret
        <div className="text-xs font-normal text-gray-500 mt-1">マスク表示のみ（再表示不可）</div>
      </th>
      <th className="p-3 border-b">scope</th>
      <th className="p-3 border-b">状態</th>
      <th className="p-3 border-b">操作</th>
    </tr>
  </thead>
);