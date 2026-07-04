/**
 * @file dashboards.ts
 * @description ダッシュボード関連のAPI操作
 */
import { apiGet, apiPost, apiPut, apiDelete, apiPostForm, apiPutForm } from "./client";

/**
 * ダッシュボードリンクの基本情報の型定義 (backend/app/schemas/dashboard_link.py の DashboardLinkRead に対応)
 */
export interface DashboardLink {
  id: string; // UUID
  title: string; // 表示名
  url: string; // アクセス先URL
  icon_path?: string; // アイコンのパス
  order_index: number; // 並び順
}

/**
 * ダッシュボードリンク作成時の入力データ (backend/app/schemas/dashboard_link.py の DashboardLinkCreate に対応)
 */
export interface CreateDashboardLinkRequest {
  title: string; // 表示名
  url: string; // アクセス先URL
  icon_path?: string; // アイコンのパス
  order_index?: number; // 並び順
}

/**
 * ダッシュボードリンク一覧を取得します。
 */
export async function fetchDashboardLinks(): Promise<DashboardLink[]> {
  try {
    const data = await apiGet("/dashboards/");
    return data as DashboardLink[];
  } catch (error) {
    console.error(`Failed to fetch dashboard links: ${error}`);
    return [];
  }
}

/**
 * 特定のダッシュボードリンクを取得します。
 * @param id リンクの識別子(UUID)
 */
export async function fetchDashboardLink(id: string): Promise<DashboardLink | null> {
  try {
    const data = await apiGet(`/dashboards/${id}`);
    return data as DashboardLink;
  } catch (error) {
    console.error(`Failed to fetch dashboard link ${id}: ${error}`);
    return null;
  }
}

/**
 * 新しいダッシュボードリンクを作成します。
 */
export async function createDashboardLink(data: CreateDashboardLinkRequest): Promise<DashboardLink> {
  const response = await apiPost("/dashboards/", data);
  return response as DashboardLink;
}

/**
 * ファイルアップロード付きでダッシュボードリンクを作成します。
 */
export async function createDashboardLinkForm(formData: FormData): Promise<DashboardLink> {
  const response = await apiPostForm("/dashboards/", formData);
  return response as DashboardLink;
}

/**
 * ダッシュボードリンクを更新します。
 * @param id 更新対象のID
 * @param data 更新データ
 */
export async function updateDashboardLink(id: string, data: Partial<CreateDashboardLinkRequest>): Promise<DashboardLink> {
  const response = await apiPut(`/dashboards/${id}`, data);
  return response as DashboardLink;
}

/**
 * ファイルアップロード付きでダッシュボードリンクを更新します。
 */
export async function updateDashboardLinkForm(id: string, formData: FormData): Promise<DashboardLink> {
  const response = await apiPutForm(`/dashboards/${id}`, formData);
  return response as DashboardLink;
}

/**
 * ダッシュボードリンクを削除します。
 * @param id 削除対象のID
 */
export async function deleteDashboardLink(id: string): Promise<void> {
  await apiDelete(`/dashboards/${id}`);
}