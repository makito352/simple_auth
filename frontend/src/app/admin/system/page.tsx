"use client";

import { useState, useEffect } from "react";

/**
 * システム管理ページ
 * サーバーの状態や基本設定（例：メンテナンスモード、通知設定など）を管理するページです。
 */
export default function SystemPage() {
  const [loading, setLoading] = useState(true);
  // 将来的に API から取得するシステム情報のステート
  const [systemStatus, setSystemStatus] = useState<{ 
    isMaintenance: boolean; 
    version: string; 
    uptime: string 
  }>({
    isMaintenance: false,
    version: "1.0.0",
    uptime: "00:00:00"
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    // 将来的にシステム情報の取得APIを呼び出す（例: fetchSystemInfo()）
    async function loadSystemData() {
      setLoading(true);
      try {
        // ここで API 連携を行う予定
        // const data = await fetchSystemInfo();
        // setSystemStatus(data);
      } catch (error) {
        console.error("Failed to load system status", error);
      } finally {
        setLoading(false);
      }
    }
    loadSystemData();
  }, []);

  const handleUpdateSetting = async (settingName: string, value: any) => {
    try {
      // 将来的に updateSystemSetting API を呼び出す
      setMessage({ text: `${settingName} を更新しました`, type: "success" });
    } catch (error) {
      setMessage({ text: `更新に失敗しました`, type: "error" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <div className="p-8">システム情報を読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">システム管理</h1>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* システム基本情報カード */}
        <div className="bg-gray-50 p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">システムステータス</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">バージョン</span>
              <span className="font-mono">{systemStatus.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">稼働時間</span>
              <span>{systemStatus.uptime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">メンテナンスモード</span>
              <span className={systemStatus.isMaintenance ? "text-red-600 font-bold" : "text-green-600"}>
                {systemStatus.isMaintenance ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>

        {/* 設定変更用カード */}
        <div className="bg-gray-50 p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">基本設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">通知の有無</label>
              <button 
                onClick={() => handleUpdateSetting("notification", true)}
                className="px-3 py-1 bg-white border rounded hover:bg-gray-100"
              >
                有効にする
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">管理用パスワード再設定</label>
              <button 
                onClick={() => handleUpdateSetting("password_reset", true)}
                className="px-3 py-1 bg-white border rounded hover:bg-gray-100"
              >
                更新ボタン（準備中）
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">開発者向けメモ</h3>
        <p className="text-xs text-blue-600 leading-relaxed">
          このページはシステム全体の管理用です。バックエンドに設定APIが実装されたら、<br/>
          `fetchSystemInfo()` や `updateSystemSetting()` などの関数を lib/api 内に追加し、<br/>
          現在のコンポーネントから呼び出すように拡張します。
        </p>
      </div>
    </div>
  );
}