/**
 * @file frontend/src/components/features/devices/useDeviceActions.ts
 * @description デバイスの更新・削除アクションを管理するカスタムフック。
 */

import { useState } from "react";

/**
 * デバイス操作（保存、削除）の状態管理と実行を行うフック。
 * @returns 保存中ID、削除中ID、およびそれぞれの実行関数
 */
export function useDeviceActions() {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * デバイスの情報を更新する（コメントなど）
   */
  const onSaveAction = async (id: string) => {
    setSavingId(id);
    try {
      // ここで APIリクエストを実行 (例: updateDevice(id, data))
      // await updateDevice(id, ...);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSavingId(null);
    }
  };

  /**
   * デバイスを削除する
   */
  const onDeleteAction = async (id: string) => {
    setDeletingId(id);
    try {
      // ここで APIリクエストを実行 (例: deleteDevice(id))
      // await deleteDevice(id);
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    savingId,
    deletingId,
    onSaveAction,
    onDeleteAction,
  };
}