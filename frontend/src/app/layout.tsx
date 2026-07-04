// frontend/src/app/layout.tsx
/**
 * ルートレイアウト
 * アプリケーション全体の共通構造を定義します。
 */
import { Toaster } from 'sonner';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}