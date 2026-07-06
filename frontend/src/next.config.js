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
