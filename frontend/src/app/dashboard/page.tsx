/**
 * @file frontend/src/app/dashboard/page.tsx
 * @description ダッシュボードページのコンポーネント。ユーザーがログイン後にアクセスするメイン画面です。
 *              ユーザーの役割に応じて、利用可能なリンクを表示します。
 */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { type DashboardLink,fetchDashboardLinks } from "@/lib/api/dashboards";
import { fetchUserProfile, isAdmin } from "@/lib/api/users";
import { logout } from "@/lib/api/webauthn";
import { logger } from "@/lib/logger";
import { type UserProfile } from "@/types";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<DashboardLink[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  // ログアウト処理のハンドラー
  const handleLogout = async () => {
    try {
      await logout(); // APIを叩く
      // ログアウト後にホームページへリダイレクト
      window.location.href = "/";
    } catch (err) {
      logger.error(`Logout failed: ${err}`);
    }
  };
  useEffect(() => {
    /**
     * データを一括で取得する
     */
    async function fetchData() {
      try {
        // 現在のユーザー情報を取得
        const userData = await fetchUserProfile();
        setUser(userData);

        // ダッシュボードリンクを取得
        const data = await fetchDashboardLinks();
        setLinks(data);
      } catch (error) {
        logger.error(`Failed to fetch dashboard data: ${error}`);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ロード中の表示処理
  if (loading) {
    return <LoadingSpinner />;
  }

  // 管理者かどうかを判定（共通ロジックを使用）
  const isUserAdmin = isAdmin(user);

  return (
    <div className="max-w-md mx-auto p-6">
      {/* ヘッダーエリア */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">SimpleAuth Launcher</h1>
        <button 
          onClick={handleLogout}
          className="text-sm bg-gray-100 hover:bg-red-50 px-3 py-1 rounded border border-gray-300"
        >
          ログアウト
        </button>
      </header>

      <div className="space-y-4">
        {links.length > 0 ? (
          links.map((link) => {
          return (
            <a 
              key={link.id} 
              href={link.url}
              className="flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              {link.icon_path ? (
                <Image
                  src={link.icon_path}
                  alt={link.title}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-md object-cover bg-gray-50"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-md" />
              )}
              <span className="text-lg font-medium text-gray-700">{link.title}</span>
            </a>
            );
          })
        ) : fetchError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            ダッシュボードのリンクを取得できませんでした。管理者に問い合わせてください。
          </div>
        ) : null}

        <div className="pt-6 border-t mt-6">
          <a 
            href="/devices" 
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <span>⚙️</span> 認証ディバイスの管理へ移動
          </a>
        </div>

        {/* 管理者の場合のみ、最後に「管理パネル」へのリンクを追加 */}
        {isUserAdmin && (
          <div className="pt-2">
            <a 
              href="/admin" 
              className="flex items-center gap-2 text-sm text-red-600 font-bold hover:underline"
            >
              <span>🔐</span> 管理者パネルへ移動
            </a>
          </div>
        )}
      </div>
    </div>
  );
}