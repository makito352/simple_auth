/**
 * @file next.config.js
 * @description Next.jsの設定ファイル
 */
const { logger, getCurrentEnv } = require('@/lib/logger');

console.log(`[CONFIG] Current Environment: ${getCurrentEnv()}`);
if (process.env.NODE_ENV === 'development') {
  console.log(`[CONFIG] Running in DEVELOPMENT mode`);
}


// 単純な console.log で出力されるかまず確認（エイリアスの解決問題を避けるため）
console.log("--- CONFIG_CHECK: START ---"); 
console.log(`Current Env: ${process.env.NODE_ENV}`);
console.log("--- CONFIG_CHECK: END ---");

// module.exports = {
//   webpackDevMiddleware: config => {
//     config.watchOptions = {
//       poll: 1000,
//       aggregateTimeout: 300,
//     };
//     return config;
//   },
//   devIndicators: {
//     buildActivity: false,
//   },
//   // ★ HMR の WebSocket URL を固定
//   // serverRuntimeConfig: {
//   //   websocketUrl: process.env.NEXT_PUBLIC_WS_URL,
//   // },
//   serverRuntimeConfig: {
//     websocketUrl: "wss://desptop-2024.tailc29351.ts.net/_next/webpack-hmr",
//   },
//   // allowedDevOrigins: [process.env.NEXT_PUBLIC_DEV_ORG,'desptop-2024.tailc29351.ts.net'],
//   allowedDevOrigins: ['desptop-2024.tailc29351.ts.net'],
// };