/**
 * @file frontend/src/app/admin/useroption/page.tsx
 * @description 管理者用のカスタムフィールド定義ページ
 * このページでは、管理者がシステム内で使用するカスタムフィールド（例: imap_server, smtp_portなど）を定義・更新できます。
 * フォームを通じて新しい属性を追加したり、既存の属性を編集することが可能です。
 * また、属性の暗号化設定も行うことができます。
 */
"use client";

import React, { useState, useEffect } from 'react';
import { fetchOptionAttributes, createOptionAttribute, updateOptionAttribute } from '@/lib/api/user_options';
import { OptionAttribute } from '@/types';
import { getErrorMessage } from "@/lib/error";
import { LoadingSpinner } from "@/app/components/loading-spinner";
import { toast } from 'sonner';

/**
 * 属性管理ページ
 * 管理者がシステム内の設定項目（例: imap_server, smtp_portなど）を定義・更新する画面です。
 */
export default function OptionAttributePage() {
  // 属性リストの保持用状態
  const [attributes, setAttributes] = useState<OptionAttribute[]>([]);
  // データ取得中かどうかのフラグ
  const [loading, setLoading] = useState(true);
  // 現在編集中の項目のID（nullの場合は新規作成モード）
  const [isEditing, setIsEditing] = useState<string | null>(null);
  // フォームの入力内容を管理する状態
  const [formData, setFormData] = useState({ id: '', key: '', encrypted: false });

  /**
   * コンポーネントのマウント時に属性データを初期ロードする
   */
  useEffect(() => {
    async function loadAttributeData() {
      try {
        const data = await fetchOptionAttributes();
        setAttributes(data);
      } catch (error) {
        const errorMessage = getErrorMessage(error, "属性データの読み込みに失敗しました。");
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    loadAttributeData();
  }, []);

  /**
   * フォームの入力値が変更された際に呼び出されるハンドラ
   * @param e ReactのChangeEvent<HTMLInputElement>
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /**
   * フォームの送信時に呼び出されるハンドラ
   * 新規登録または既存属性の更新を実行し、成功後にリストを再取得します。
   * @param e ReactのFormEvent
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 編集モードか新規作成モードかを判定して適切なAPIを呼び出す
      if (isEditing) {
        await updateOptionAttribute(formData.id, {
          key: formData.key,
          encrypted: formData.encrypted,
        });
      } else {
        await createOptionAttribute({
          key: formData.key,
          encrypted: formData.encrypted,
        });
      }

      // 更新・追加成功後に最新のリストを再取得
      const data = await fetchOptionAttributes();
      setAttributes(data);
      toast.success(isEditing ? "更新しました" : "新規登録しました");
      
      // フォームの状態をリセット
      setIsEditing(null);
      setFormData({ id: '', key: '', encrypted: false });
    } catch (error) {
      const errorMessage = getErrorMessage(error, "属性の保存に失敗しました。");
      toast.error(errorMessage);
    }
  };

  // 読み込み中の状態表示
  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">カスタムフィールド定義</h1>

      {/* 登録/編集フォーム */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 border">
        <h2 className="text-lg font-semibold mb-4">
          {isEditing ? "項目の編集" : "新規項目の追加"}
        </h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">キー (例: imap_server)</label>
            <input
              type="text"
              name="key"
              value={formData.key}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
              placeholder="項目の識別子を入力"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="encrypted"
              checked={formData.encrypted}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">暗号化を有効にする</label>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {isEditing ? "更新する" : "追加する"}
          </button>
        </div>
      </form>

      {/* 既存リスト表示 */}
      <div className="bg-white rounded shadow overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">キー</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">暗号化</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attributes.map((attr) => (
              <tr key={attr.id}>
                <td className="px-6 py-4 text-sm text-gray-900 font-mono">{attr.key}</td>
                <td className="px-6 py-4 text-sm">
                  {attr.encrypted ? (
                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">有効</span>
                  ) : (
                    <span className="text-gray-500 bg-gray-50 px-2 py-1 rounded text-xs">無効</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => {
                      setFormData({ id: attr.id, key: attr.key, encrypted: attr.encrypted });
                      setIsEditing(attr.id);
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}