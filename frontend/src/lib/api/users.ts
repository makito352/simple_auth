/**
 * @file users.ts
 * @description ユーザー操作に関するAPI操作と共通ロジック
 */
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import { logger } from "@/lib/logger";
import { UserProfile, CreateUserRequest, UpdateUserRequest } from "@/types";

/**
 * ユーザー情報を取得する共通関数
 * 内部で権限チェックなどを行う必要がない「自分の情報」や「一覧（あれば）」の取得に使用
 */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await apiGet("/users/me");
    const profile = data as UserProfile;
    
    if (profile) {
      logger.debug(`Fetched user profile: ${JSON.stringify(profile)}`);
    } else {
      logger.warn("Fetched user profile is empty");
    }

    return profile;
  } catch (error) {
    logger.error(`Failed to fetch user profile: ${error}`);
    return null;
  }
}

/**
 * 【管理者向け】
 * ユーザー一覧を取得する（管理者権限が必要な操作）
 */
export async function fetchUserList(): Promise<UserProfile[]> {
  const data = await apiGet("/admin/users/");
  return data as UserProfile[];
}

/**
 * 【管理者向け】
 * ユーザーを作成する（管理者権限が必要な操作）
 */
export async function createUser(data: CreateUserRequest): Promise<UserProfile> {
  const response = await apiPost("/admin/users/", data);
  return response as UserProfile;
}

/**
 * 【管理者向け】
 * ユーザー情報を更新する（管理者権限が必要な操作）
 * @param id 更新対象のユーザーID
 * @param data 更新データ
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<UserProfile> {
  const response = await apiPut(`/admin/users/${id}`, data);
  return response as UserProfile;
}

/**
 * 【管理者向け】
 * ユーザーを削除する（管理者権限が必要な操作）
 * @param id 削除対象のユーザーID
 */
export async function deleteUser(id: string): Promise<void> {
  await apiDelete(`/admin/users/${id}`);
}

/**
 * ユーザーが管理者権限を持っているか判定する
 * フロントエンドのコンポーネントやロジックで「isAdmin」という概念を統一するために使用します。
 */
export const isAdmin = (user: UserProfile | null): boolean => {
  // ユーザーが存在せず、かつロールがadminでない場合はfalse
  const result = user !== null && user.role === "admin";
  logger.debug(`isAdmin check - user: ${JSON.stringify(user)}, result: ${result}`);
  return result;
};