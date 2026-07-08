
/**
 * @file Sidebar.tsx
 * 管理画面用のサイドナビゲーションメニューを定義するコンポーネント。
 * ユーザーの操作導線を確保し、各管理機能へのアクセスを提供します。
 */
"use client";

import { ArrowLeft } from "lucide-react";
import { ADMIN_MENU_ITEMS } from "../constants/constants";

/**
 * 管理者用サイドバーのコンポーネント
 * 
 * @description
 * - 上部にダッシュボードへの戻りボタンと現在のセクション（管理者画面）のラベルを表示。
 * - `ADMIN_MENU_ITEMS` 定数に基づいて動的にメニュー項目を生成。
 * - 各アイテムはホバー時に背景色とパディングが変化するアニメーションを含む。
 * 
 * @returns 管理者用サイドバーのJSX要素
 */
export default function Sidebar() {
  return (
    <aside className="w-72 bg-slate-50 border-r border-gray-200 shadow-sm flex flex-col">
      <nav className="flex flex-col h-full">
        {/* ヘッダーセクション: 戻るボタンと現在の権限ラベル */}
        <div className="border-b border-gray-300 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <a 
              href="/dashboard" 
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>ダッシュボード</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            {/* 管理者権限であることを示すバッジ */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              管理者画面
            </span>
          </div>
        </div>

        {/* メインメニューセクション */}
        <div className="flex-1 p-4 flex flex-col gap-2">
          {ADMIN_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <a 
                key={item.href}
                href={item.href} 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
              >
                {/* アイコン表示 */}
                <span className="text-gray-600"><Icon size={18} /></span>
                {/* メニュー項目名 */}
                <span>{item.title}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}