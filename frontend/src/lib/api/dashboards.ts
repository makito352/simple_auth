/**
 * @file frontend/src/lib/api/dashboards.ts
 * @description ダッシュボード関連のAPI操作
 */
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut, apiPutForm } from "./client";

/**
 * ダッシュボードリンクの基本情報の型定義 (backend/app/schemas/dashboard_link.py の DashboardLinkRead に対応)
 */
export interface DashboardLink {
  id: string;          // UUID
  title: string;       // 表示名
  url: string;         // アクセス先URL
  icon_path?: string;  // アイコンのパス
  order_index: number; // 並び順
}

/**
 * ダッシュボードリンク作成時の入力データ (backend/app/schemas/dashboard_link.py の DashboardLinkCreate に対応)
 */
export interface CreateDashboardLinkRequest {
  title: string;         // 表示名
  url: string;           // アクセス先URL
  icon_path?: string;    // アイコンのパス
  order_index?: number;  // 並び順
}

/**
 * ダッシュボードリンク一覧を取得します。
 */
export async function fetchDashboardLinks(): Promise<DashboardLink[]> {
  const data = await apiGet("/dashboards/");
  return data as DashboardLink[];
}

/**
 * 【管理者向け】特定のダッシュボードリンクを取得します。
 * @param id リンクの識別子(UUID)
 */
export async function fetchDashboardLink(id: string): Promise<DashboardLink | null> {
  const data = await apiGet(`/admin/dashboards/${id}`);
  return data as DashboardLink | null;
}

/**
 * 【管理者向け】新しいダッシュボードリンクを作成します。
 */
export async function createDashboardLink(data: CreateDashboardLinkRequest): Promise<DashboardLink> {
  const response = await apiPost("/admin/dashboards/", data);
  return response as DashboardLink;
}

/**
 * 【管理者向け】ファイルアップロード付きでダッシュボードリンクを作成します。
 */
export async function createDashboardLinkForm(formData: FormData): Promise<DashboardLink> {
  const response = await apiPostForm("/admin/dashboards/", formData);
  return response as DashboardLink;
}

/**
 * 【管理者向け】ダッシュボードリンクを更新します。
 * @param id 更新対象のID
 * @param data 更新データ
 */
export async function updateDashboardLink(id: string, data: Partial<CreateDashboardLinkRequest>): Promise<DashboardLink> {
  const response = await apiPut(`/admin/dashboards/${id}`, data);
  return response as DashboardLink;
}

/**
 * 【管理者向け】ファイルアップロード付きでダッシュボードリンクを更新します。
 */
export async function updateDashboardLinkForm(id: string, formData: FormData): Promise<DashboardLink> {
  const response = await apiPutForm(`/admin/dashboards/${id}`, formData);
  return response as DashboardLink;
}

/**
 * 【管理者向け】ダッシュボードリンクを削除します。
 * @param id 削除対象のID
 */
export async function deleteDashboardLink(id: string): Promise<void> {
  await apiDelete(`/admin/dashboards/${id}`);
}