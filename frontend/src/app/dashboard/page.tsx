"use client";

import { useEffect, useState } from "react";
import { fetchDashboardLinks, type DashboardLink } from "@/lib/api/dashboards";
import { fetchUserProfile, isAdmin, type UserProfile } from "@/lib/api/users";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<DashboardLink[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

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
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // 管理者かどうかを判定（共通ロジックを使用）
  const isUserAdmin = isAdmin(user);

  return (
    <div>
      <h1>SimpleAuth Launcher</h1>

      <ul className="space-y-3">
        {links.map((link) => {
          return (
            <li key={link.id} className="flex items-center gap-3">
              {link.icon_path ? (
                <img
                  src={link.icon_path}
                  alt={link.title}
                  className="w-8 h-8 rounded"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded" />
              )}
              <a href={link.url} className="text-blue-600 hover:underline">
                {link.title}
              </a>
            </li>
          );
        })}

        {/* 管理者の場合のみ、最後に「管理パネル」へのリンクを追加 */}
        {isUserAdmin && (
          <li key="admin-link">
            <a href="/admin">⚙️ 管理者パネルへ移動</a>
          </li>
        )}
      </ul>
    </div>
  );
}