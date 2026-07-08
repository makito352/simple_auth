/**
 * @file ルートレイアウト
 * アプリケーション全体の共通構造とメタデータを定義します。
 */

import { Toaster } from 'sonner';

/**
 * アプリケーションのメタデータ設定（アイコン等）
 */
export const metadata = {
  icons: [
    {
      rel: 'icon',
      url: '/icons/icon_16.ico',
    },
    {
      rel: 'icon',
      url: '/icons/icon_32.ico',
    },
    {
      rel: 'icon',
      url: '/icons/icon_64.ico',
    },
    {
      rel: 'icon',
      url: '/icons/logo_1024.png',
    },
    {
      rel: 'icon',
      url: '/icons/logo_256.png',
    },
    {
      rel: 'icon',
      url: '/icons/logo_512.png',
    },
  ],
};

/**
 * ルートレイアウトコンポーネント
 * アプリケーション全体のHTML構造を定義し、ToasterなどのグローバルなUI要素を配置します。
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {React.ReactNode} props.children - レンダリングする子要素
 * @returns {JSX.Element}
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {/* アプリケーションのメインコンテンツ */}
        {children}
        
        {/* 通知用トースト通知（右上、リッチカラー設定） */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}