/**
 * @file 管理者用メニュー項目の定数定義
 * @description メニューのタイトル、リンク先、説明、および対応するアイコンを一元管理します。
 */

import type { LucideIcon } from "lucide-react";
import { 
  KeyRound, 
  LayoutDashboard, 
  Settings, 
  SlidersHorizontal, 
  User, 
  Users 
} from "lucide-react";

/**
 * 管理者用メニュー項目の型定義
 * @property {string} title - メニュー項目のタイトル
 * @property {string} href - メニュー項目のリンク先URL
 * @property {string} [desc] - メニュー項目の説明（省略可能）
 * @property {LucideIcon} icon - メニュー項目に対応するアイコンコンポーネント
 */
export interface AdminMenuItem {
  title: string;    // メニュー項目のタイトル
  href: string;     // メニュー項目のリンク先URL
  desc?: string;    // ページ一覧用の説明
  icon: LucideIcon; // アイコンコンポーネントそのものを保持する
}

/**
 * 管理者向けメニューの一覧
 * 各項目のタイトル、パス、説明、アイコンを一元管理します。
 */
export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { 
    title: "ダッシュボード設定", 
    href: "/admin/dashboards", 
    desc: "ホーム画面の表示項目の設定",
    icon: LayoutDashboard
  },
  { 
    title: "連携プロトコル(OIDC)設定", 
    href: "/admin/oidc", 
    desc: "外部連携用のスコープとデータ項目の定義",
    icon: Settings
  },
  { 
    title: "OIDCクライアント管理", 
    href: "/admin/oidc_clients", 
    desc: "Photoprism等の接続先追加・認証キー発行",
    icon: KeyRound
  },
  { 
    title: "カスタムフィールド定義", 
    href: "/admin/useroption", 
    desc: "連携用項目の定義（メールサーバの接続パスワード、組織情報や独自の識別子など）",
    icon: SlidersHorizontal
  },
  { 
    title: "ユーザーデータ管理", 
    href: "/admin/uservalues", 
    desc: "各ユーザー固有の属性値の設定",
    icon: User
  },
  { 
    title: "ユーザー・権限管理", 
    href: "/admin/users", 
    desc: "アカウント作成と操作権限の付与",
    icon: Users
  },
];