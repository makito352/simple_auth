"use client";

import React, { useState, useEffect } from 'react';
import { fetchOptionAttributes, fetchUserOptions, updateUserOptions } from '@/lib/api/user_options';
import { fetchUserList } from '@/lib/api/users';
import { OptionAttribute, UserOption } from '@/types';
import { UserProfile } from '@/lib/api/users';
import { toast } from 'sonner';

/**
 * ユーザー設定値管理ページ
 * 管理者が特定ユーザーのオプション設定値（imap_serverなど）を参照・更新する画面です。
 */
export default function UserOptionValuesPage() {
  // 属性一覧（キー定義）の状態
  const [attributes, setAttributes] = useState<OptionAttribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(true);

  // ユーザー一覧の状態
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ユーザー設定値の状態
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const [userOptionFormData, setUserOptionFormData] = useState<Record<string, string>>({});
  const [isSavingUserOptions, setIsSavingUserOptions] = useState(false);

  // 属性データとユーザー一覧を取得
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [attrData, userData] = await Promise.all([
          fetchOptionAttributes(),
          fetchUserList(),
        ]);
        setAttributes(attrData);
        setUsers(userData);
      } catch (error) {
        toast.error("データの読み込みに失敗しました。");
      } finally {
        setAttributesLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // ユーザーが選択されたときにそのユーザーのオプション値を読み込む
  useEffect(() => {
    async function loadUserOptionsData() {
      if (!selectedUserId) {
        setUserOptions([]);
        setUserOptionFormData({});
        return;
      }

      setUserOptionsLoading(true);
      try {
        const options = await fetchUserOptions(selectedUserId);
        setUserOptions(options);

        // フォームデータを初期化
        const formData: Record<string, string> = {};
        options.forEach(opt => {
          formData[opt.key] = opt.value || '';
        });
        setUserOptionFormData(formData);
      } catch (error) {
        toast.error("ユーザーの設定値読み込みに失敗しました。");
      } finally {
        setUserOptionsLoading(false);
      }
    }
    loadUserOptionsData();
  }, [selectedUserId]);

  // ユーザー設定値フォームの変更ハンドラ
  const handleUserOptionChange = (key: string, value: string) => {
    setUserOptionFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // 保存処理
  const handleSaveUserOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("ユーザーを選択してください。");
      return;
    }

    // フォームデータから UserOption[] に変換
    const options: UserOption[] = Object.entries(userOptionFormData).map(([key, value]) => ({
      key,
      value,
    }));

    setIsSavingUserOptions(true);
    try {
      await updateUserOptions(selectedUserId, options);
      toast.success("設定値を保存しました。");
    } catch (error) {
      toast.error("保存に失敗しました。");
    } finally {
      setIsSavingUserOptions(false);
    }
  };

  if (attributesLoading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ユーザー設定値</h1>

      {attributes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <p className="text-yellow-800">
            設定項目が未定義です。先に「属性管理」ページで項目を追加してください。
          </p>
        </div>
      ) : (
        <>
          {/* ユーザー選択 */}
          <div className="bg-white p-6 rounded shadow mb-8 border">
            <h2 className="text-lg font-semibold mb-4">ユーザー選択</h2>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
              className="block w-full border rounded-md p-2 bg-white"
            >
              <option value="">-- ユーザーを選択 --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {/* ユーザー設定値フォーム */}
          {selectedUserId && (
            <form onSubmit={handleSaveUserOptions} className="bg-white p-6 rounded shadow border">
              <h2 className="text-lg font-semibold mb-4">設定値の編集</h2>

              {userOptionsLoading ? (
                <div className="py-4 text-center text-gray-600">読み込み中...</div>
              ) : (
                <div className="grid gap-6">
                  {attributes.map((attr) => (
                    <div key={attr.id} className="border rounded-md p-4 bg-gray-50">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {attr.key}
                        {attr.encrypted && (
                          <span className="ml-2 text-xs bg-red-50 text-red-600 px-2 py-1 rounded">
                            暗号化
                          </span>
                        )}
                      </label>
                      <input
                        type={attr.encrypted ? 'password' : 'text'}
                        value={userOptionFormData[attr.key] || ''}
                        onChange={(e) => handleUserOptionChange(attr.key, e.target.value)}
                        placeholder={`${attr.key}の値を入力`}
                        className="block w-full border rounded-md p-2"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingUserOptions}
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSavingUserOptions ? '保存中...' : '保存する'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
