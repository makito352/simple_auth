/**
 * @file frontend/src/components/features/devices/useDeviceActions.ts
 * @description デバイスの更新・削除アクションの状態（Loadingなど）を管理するカスタムフック。
 */

import { useState } from "react";

import { deleteDeviceCredential, updateDeviceComment } from "@/lib/api/devices";
import { getErrorMessage } from "@/lib/error";

/**
 * 入力されたコメントの前後にある空白を削除し、空文字の場合はnullを返します。
 */
function normalizeCommentInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * デバイス操作（保存、削除）の状態管理と実行を行うフック。
 * @returns 保存中ID、削除中ID、エラーメッセージ
 */
export function useDeviceActions() {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * デバイスの情報を更新する（コメントなど）
   * @param id - デバイスID
   * @param commentDraft - 入力中のドラフト（Page側から渡される）
   */
  const onSaveAction = async (id: string, commentDraft: string) => {
    setSavingId(id);
    setError(null);
    try {
      const comment = normalizeCommentInput(commentDraft);
      await updateDeviceComment(id, comment);
      // 成功時、Page側のデータ更新は再取得またはPropの変更で行うためここでは何もしない
    } catch (e) {
      setError(getErrorMessage(e, "コメントの更新に失敗しました"));
    } finally {
      setSavingId(null);
    }
  };

  /**
   * デバイスを削除する
   */
  const onDeleteAction = async (id: string) => {
    const confirmed = window.confirm("このデバイスを削除します。よろしいですか？");
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);
    try {
      await deleteDeviceCredential(id);
      // 成功時、データの削除はPage側で処理（または再取得）
    } catch (e) {
      setError(getErrorMessage(e, "デバイスの削除に失敗しました。"));
    } finally {
      setDeletingId(null);
    }
  };

  return {
    savingId,
    deletingId,
    error,
    onSaveAction,
    onDeleteAction,
  };
}