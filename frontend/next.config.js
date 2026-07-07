/**
 * @file next.config.js
 * @description Next.jsの設定ファイル
 */
const nextConfig = {};

console.log(`[CONFIG] Current Environment: ${process.env.NODE_ENV}`);
if (process.env.NODE_ENV === 'development') {
  console.log(`[CONFIG] Running in DEVELOPMENT mode`);

  // 開発環境のみ適用する設定を追加
  nextConfig.allowedDevOrigins = [process.env.NEXT_PUBLIC_HOSTNAME];
}

module.exports = nextConfig;