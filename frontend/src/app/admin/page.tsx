/**
 * @file frontend/src/app/admin/page.tsx
 * @description 管理者用ポータルのメインページ
 *              システム管理機能へのショートカットを含む管理者メニューを表示します。
 */

import Link from "next/link";

import { ADMIN_MENU_ITEMS } from "@/components/features/admin/constants";

/**
 * 管理者メニューコンポーネント
 * 
 * @returns 管理者向けのナビゲーションカード一覧を含むJSX要素
 */
export default function AdminPortal() {

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">管理者メニュー</h1>
      {/* 管理メニュー項目のグリッド表示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ADMIN_MENU_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="p-6 border rounded shadow hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-bold"><Icon size={20} /> {item.title}</h2>
              </div>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}