import Link from "next/link";

export default function AdminPortal() {
  const menuItems = [
    { title: "ダッシュボード設定", href: "/admin/dashboards", desc: "リンクの追加・削除" },
    { title: "システム管理", href: "/admin/useroption", desc: "ユーザ個別プロファイル設定(OIDCユーザ個別設定)" },
    { title: "システム管理", href: "/admin/oidc", desc: "OIDC / スコープ・クレーム設定" },
    { title: "システム管理", href: "/admin/oidc/clients", desc: "OIDC / クライアント設定" },
    { title: "ユーザー管理", href: "/admin/users", desc: "権限・アカウント操作" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">管理者メニュー</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className="p-6 border rounded shadow hover:bg-gray-50"
          >
            <h2 className="font-bold">{item.title}</h2>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}