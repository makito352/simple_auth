// import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, type UserProfile } from "@/lib/api/users";
import { logger } from "@/lib/logger";
// import { buildUrl } from "@/lib/api/client";
import { fetchUserProfileForServer } from "@/lib/api/users_server"
import { LayoutDashboard, Settings, User, Users, ArrowLeft, SlidersHorizontal, KeyRound } from "lucide-react";

// async function fetchUserProfileForServer(): Promise<UserProfile | null> {
//   const cookieStore = await cookies();
//   const sessionCookie = cookieStore.get("simpleauth_session")?.value;
//   // const rawBackendUrl = process.env.NEXT_PUBLIC_API_URL;
//   const targetUrl = buildUrl("/users/me");
//   // if (!rawBackendUrl) {
//   //   logger.error(`fetchUserProfileForServer - NEXT_PUBLIC_API_URL is not defined. Current value: "${rawBackendUrl}"`);
//   //   return null;
//   // }
//   if (!targetUrl) { // buildUrl内のロジックに合わせるため、または単純な存在チェックとして
//     logger.error(`fetchUserProfileForServer - URL construction failed.`);
//     return null;
//   }
//   if (!sessionCookie) {
//     logger.warn("fetchUserProfileForServer - session cookie not found");
//     return null;
//   }
//   logger.debug(`fetchUserProfileForServer - Attempting to fetch from URL: ${targetUrl}`);

//   try {
//     const response = await fetch(targetUrl, {
//       headers: {
//         Cookie: `simpleauth_session=${sessionCookie}`,
//       },
//       credentials: "include",
//       cache: "no-store",
//     });

//     if (!response.ok) {
//       logger.warn(`fetchUserProfileForServer - API returned ${response.status}`);
//       return null;
//     }

//     const data = await response.json();
//     logger.debug(`fetchUserProfileForServer - Raw response body: ${JSON.stringify(data)}`);

//     const user = data as UserProfile;
//     logger.debug(`fetchUserProfileForServer - loaded user: ${JSON.stringify(user)}`);
//     return user;
//   } catch (error) {
//     logger.error(`fetchUserProfileForServer - failed: ${error}`);
//     return null;
//   }
// }

/**
 * 管理者権限チェック用の関数
 */
async function validateAdmin() {
  const user = await fetchUserProfileForServer();
  logger.debug(`validateAdmin - Fetching user profile. Result: ${user ? "Success" : "Failed"}`);

  if (!user) {
    logger.warn("validateAdmin - User not found. Redirecting to /.");
    redirect("/");
  }

  const isAllowed = isAdmin(user);

  if (!isAllowed) {
    logger.warn(`validateAdmin - Access denied for user: ${JSON.stringify(user)}. Redirecting to /dashboard.`);
    redirect("/dashboard");
  }

  logger.debug("validateAdmin - Success. User is authorized.");
}
/**
 * 管理者用セクションの共通レイアウト
 * このコンポーネントはすべての管理系ページ（/admin/links, /admin/settings等）に適用されます。
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await validateAdmin();

  return (
    <div className="flex min-h-screen bg-white">
      {/* 左側の固定サイドバー - Admin Panel デザイン */}
      <aside className="w-72 bg-slate-50 border-r border-gray-200 shadow-sm flex flex-col">
        <nav className="flex flex-col h-full">
          {/* Admin ヘッダー */}
          <div className="border-b border-gray-300 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <a 
                href="/dashboard" 
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>ダッシュボード</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                管理者画面
              </span>
            </div>
          </div>

          {/* メニューアイテム */}
          <div className="flex-1 p-4 flex flex-col gap-2">
            <a 
              href="/admin/dashboards" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
            >
              <LayoutDashboard size={18} className="text-gray-600 transition-colors" />
              <span>ダッシュボード設定</span>
            </a>
            <a 
              href="/admin/oidc" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
            >
              <Settings size={18} className="text-gray-600 transition-colors" />
              <span>OIDCスコープ・クレーム設定</span>
            </a>
            <a 
              href="/admin/oidc/clients" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
            >
              <KeyRound size={18} className="text-gray-600 transition-colors" />
              <span>OIDCクライアント管理</span>
            </a>
            <a 
              href="/admin/useroption" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
            >
              <SlidersHorizontal size={18} className="text-gray-600 transition-colors" />
              <span>カスタムフィールド設定</span>
            </a>
            <a 
              href="/admin/useroption/uservalues" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
            >
              <User size={18} className="text-gray-600 transition-colors" />
              <span>ユーザー設定値</span>
            </a>
            <a 
              href="/admin/users" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:pl-5"
            >
              <Users size={18} className="text-gray-600 transition-colors" />
              <span>ユーザー一覧・権限管理</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* 右側のメインコンテンツ */}
      <main className="flex-1 p-10 bg-white">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}