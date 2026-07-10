/**
 * @file frontend/src/app/page.tsx
 * @description SimpleAuthのホーム画面コンポーネント。
 *              ログインページへのリンクを提供します。
 */

import Link from 'next/link';

/**
 * ホーム画面を表示するメインコンポーネント
 * @returns 構成されたHTML要素を含むJSX
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-blue-600">SimpleAuth</h1>
      <Link 
        href="/login" 
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        ログインページへ
      </Link>
    </div>
  );
}