/**
 * @file フロントエンドのメインページコンポーネント
 * @description ホーム画面のUIを定義するコンポーネントです。
 */

import Link from 'next/link';

/**
 * ホーム画面を表示するメインコンポーネント
 * @returns 構成されたHTML要素を含むJSX
 */
export default function Home() {
  return (
    <div>
      <h1>ホーム画面</h1>
      <Link href="/login">ログインページへ</Link>
    </div>
  );
}
