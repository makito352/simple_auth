"use client";
/**
 * @file page.tsx
 * @description OIDCスコープとクレームマッピングの管理画面
 */
import React, { useState, useEffect } from 'react';
import { ClaimMapping, ClaimMappingInput, OidcScope, OptionAttribute } from '@/types';
import {
  createClaimMapping,
  createOidcScope,
  deleteClaimMapping,
  deleteOidcScope,
  fetchClaimMappings,
  fetchOidcScopes,
  updateClaimMapping,
  updateOidcScope,
} from '@/lib/api/oidc';
import { fetchOptionAttributes } from '@/lib/api/user_options';
import { Plus, Edit2, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

type ScopeFormState = {
  scope_name: string;
  description: string;
};

export default function OidcManagementPage() {
  const [mappings, setMappings] = useState<ClaimMapping[]>([]);
  const [scopes, setScopes] = useState<OidcScope[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<OptionAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingScopeName, setEditingScopeName] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClaimMappingInput>({
    scope: '',
    claim_name: '',
    value_source: 'static',
    value_key: '',
    static_value: '',
  });
  const [scopeFormData, setScopeFormData] = useState<ScopeFormState>({
    scope_name: '',
    description: '',
  });

  /**
   * 一覧データを再取得する
   */
  const loadData = async () => {
    const [mappingsData, attributesData, scopesData] = await Promise.all([
      fetchClaimMappings(),
      fetchOptionAttributes(),
      fetchOidcScopes(),
    ]);

    setMappings(mappingsData);
    setAttributeOptions(attributesData);
    setScopes(scopesData);
    return scopesData;
  };

  /**
   * 新規マッピングフォームを初期化する
   */
  const openNewMappingForm = (scopeOptions: OidcScope[]) => {
    if (scopeOptions.length === 0) {
      toast.error('先にOIDCスコープを追加してください');
      return;
    }

    setEditingId('new');
    setFormData({
      scope: scopeOptions[0].scope_name,
      claim_name: '',
      value_source: 'static',
      value_key: '',
      static_value: '',
    });
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const scopesData = await loadData();
        if (scopesData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            scope: prev.scope || scopesData[0].scope_name,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch OIDC admin data', error);
        toast.error('OIDC管理データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.scope) {
      toast.error('スコープを選択してください');
      return;
    }

    try {
      if (editingId === "new") {
        await createClaimMapping(formData);
        toast.success("新しく追加しました");
      } else if (editingId) {
        await updateClaimMapping(editingId, formData);
        toast.success("マッピングを更新しました");
      }

      const scopesData = await loadData();
      setEditingId(null);
      if (scopesData.length > 0) {
        setFormData({
          scope: scopesData[0].scope_name,
          claim_name: '',
          value_source: 'static',
          value_key: '',
          static_value: '',
        });
      }
    } catch (error) {
      toast.error("保存に失敗しました");
    }
  };

  /**
   * スコープの追加・更新を処理する
   */
  const handleScopeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scopeFormData.scope_name.trim()) {
      toast.error('スコープ名を入力してください');
      return;
    }

    try {
      if (editingScopeName) {
        await updateOidcScope(editingScopeName, {
          description: scopeFormData.description,
        });
        toast.success('スコープを更新しました');
      } else {
        await createOidcScope({
          scope_name: scopeFormData.scope_name.trim(),
          description: scopeFormData.description,
        });
        toast.success('スコープを追加しました');
      }

      const scopesData = await loadData();
      setEditingScopeName(null);
      setScopeFormData({ scope_name: '', description: '' });
      setFormData((prev) => ({
        ...prev,
        scope: prev.scope || scopesData[0]?.scope_name || '',
      }));
    } catch (error) {
      toast.error('スコープの保存に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('このマッピングを削除してもよろしいですか？')) {
      try {
        await deleteClaimMapping(id);
        setMappings(mappings.filter(m => m.id !== id));
        toast.success("削除しました");
      } catch (error) {
        toast.error("削除に失敗しました");
      }
    }
  };

  /**
   * スコープ削除を処理する
   */
  const handleDeleteScope = async (scope: OidcScope) => {
    if (!scope.is_deletable) {
      toast.error('このスコープは削除できません');
      return;
    }

    if (confirm(`スコープ ${scope.scope_name} を削除してもよろしいですか？`)) {
      try {
        await deleteOidcScope(scope.scope_name);
        const scopesData = await loadData();
        toast.success('スコープを削除しました');

        if (formData.scope === scope.scope_name) {
          setFormData((prev) => ({
            ...prev,
            scope: scopesData[0]?.scope_name || '',
          }));
        }
      } catch (error) {
        toast.error('スコープの削除に失敗しました');
      }
    }
  };

  const handleEdit = (mapping: ClaimMapping) => {
    setEditingId(mapping.id);
    setFormData({
      scope: mapping.scope,
      claim_name: mapping.claim_name,
      value_source: mapping.value_source,
      value_key: mapping.value_key || '',
      static_value: mapping.static_value || '',
    });
  };

  /**
   * スコープ編集フォームを開く
   */
  const handleEditScope = (scope: OidcScope) => {
    setEditingScopeName(scope.scope_name);
    setScopeFormData({
      scope_name: scope.scope_name,
      description: scope.description || '',
    });
  };

  const handleValueSourceChange = (valueSource: ClaimMapping['value_source']) => {
    setFormData((prev) => ({
      ...prev,
      value_source: valueSource,
      value_key: valueSource === 'static' ? '' : prev.value_key,
      static_value: valueSource === 'static' ? prev.static_value : '',
    }));
  };

  const getValueSourceLabel = (valueSource: ClaimMapping['value_source']) => {
    switch (valueSource) {
      case 'user_attribute':
        return 'ユーザー属性';
      case 'user_profile':
        return 'ユーザープロファイル';
      default:
        return '固定値';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">OIDCスコープ・クレーム設定</h1>
        <div className="flex gap-2">
          <a
            href="/admin/oidc/clients"
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
          >
            クライアント管理へ
          </a>
          <button 
            onClick={() => openNewMappingForm(scopes)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={scopes.length === 0}
          >
            <Plus size={18} /> 新規追加
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
        <div className="space-y-4">
          <div className="bg-white p-6 border rounded shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <div>
                <h2 className="text-lg font-semibold">OIDCスコープ管理</h2>
                <p className="text-sm text-gray-500 mt-1">クライアントとクレーム設定の基準になるスコープを管理します。</p>
              </div>
            </div>

            <form onSubmit={handleScopeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">スコープ名</label>
                <input
                  className="border p-2 w-full rounded"
                  value={scopeFormData.scope_name}
                  disabled={editingScopeName !== null}
                  onChange={(e) => setScopeFormData((prev) => ({ ...prev, scope_name: e.target.value }))}
                  placeholder="例: imap"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">説明</label>
                <input
                  className="border p-2 w-full rounded"
                  value={scopeFormData.description}
                  onChange={(e) => setScopeFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="このスコープで返す情報の説明"
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  <Save size={18} /> {editingScopeName ? '更新する' : '追加する'}
                </button>
                {(editingScopeName !== null || scopeFormData.scope_name || scopeFormData.description) && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded border hover:bg-gray-100"
                    onClick={() => {
                      setEditingScopeName(null);
                      setScopeFormData({ scope_name: '', description: '' });
                    }}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="border rounded overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 border-b">スコープ</th>
                  <th className="p-3 border-b">説明</th>
                  <th className="p-3 border-b">状態</th>
                  <th className="p-3 border-b">操作</th>
                </tr>
              </thead>
              <tbody>
                {scopes.map((scope) => (
                  <tr key={scope.scope_name} className="hover:bg-gray-50">
                    <td className="p-3 border-b font-mono text-sm">{scope.scope_name}</td>
                    <td className="p-3 border-b text-sm">{scope.description || '---'}</td>
                    <td className="p-3 border-b text-sm">
                      {scope.is_system_scope ? '標準' : 'カスタム'}
                      {!scope.is_deletable && <span className="ml-2 text-xs text-gray-500">削除不可</span>}
                    </td>
                    <td className="p-3 border-b space-x-2">
                      <button onClick={() => handleEditScope(scope)} className="text-blue-600" title="編集"><Edit2 size={18} /></button>
                      <button
                        onClick={() => handleDeleteScope(scope)}
                        className={`text-red-600 ${scope.is_deletable ? '' : 'opacity-40 cursor-not-allowed'}`}
                        title={scope.is_deletable ? '削除' : '削除できません'}
                        disabled={!scope.is_deletable}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {scopes.length === 0 && (
                  <tr>
                    <td className="p-3 text-sm text-gray-500" colSpan={4}>スコープがありません。先にスコープを追加してください。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 border rounded shadow-sm">
            <h2 className="text-lg font-semibold mb-2">OIDCクレームマッピング設定</h2>
            <p className="text-sm text-gray-500">各スコープで返すクレームの内容を定義します。</p>
          </div>

          {editingId && (
            <div className="bg-white p-6 border rounded shadow-sm">
              <h2 className="border-b pb-2 mb-4">{editingId === "new" ? '新規追加' : 'マッピングの編集'}</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm">スコープ</label>
                  <select
                    className="border p-2 w-full rounded"
                    value={formData.scope}
                    onChange={e => setFormData({ ...formData, scope: e.target.value })}
                  >
                    {scopes.map((scope) => (
                      <option key={scope.scope_name} value={scope.scope_name}>
                        {scope.scope_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">クレーム名</label>
                  <input
                    className="border p-2 w-full rounded"
                    value={formData.claim_name}
                    onChange={e => setFormData({ ...formData, claim_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm">値のソース</label>
                  <select
                    className="border p-2 w-full rounded"
                    value={formData.value_source}
                    onChange={e => handleValueSourceChange(e.target.value as ClaimMapping['value_source'])}
                  >
                    <option value="static">固定値</option>
                    <option value="user_attribute">ユーザー属性</option>
                    <option value="user_profile">ユーザープロファイル</option>
                  </select>
                </div>
                {formData.value_source === 'user_attribute' ? (
                  <div>
                    <label className="block text-sm">ユーザー属性</label>
                    <select
                      className="border p-2 w-full rounded"
                      value={formData.value_key || ''}
                      onChange={e => setFormData({ ...formData, value_key: e.target.value })}
                    >
                      <option value="">選択してください</option>
                      {attributeOptions.map((attribute) => (
                        <option key={attribute.id} value={attribute.key}>
                          {attribute.key}
                        </option>
                      ))}
                      {formData.value_key && !attributeOptions.some((attribute) => attribute.key === formData.value_key) && (
                        <option value={formData.value_key}>{formData.value_key}</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm">{formData.value_source === 'static' ? '固定値' : 'キー (属性名/項目名)'}</label>
                    <input
                      className="border p-2 w-full rounded"
                      value={formData.value_source === 'static' ? formData.static_value : formData.value_key}
                      onChange={e => {
                        if (formData.value_source === 'static') {
                          setFormData({ ...formData, static_value: e.target.value });
                        } else {
                          setFormData({ ...formData, value_key: e.target.value });
                        }
                      }}
                    />
                  </div>
                )}

                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">保存</button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded border hover:bg-gray-100"
                    onClick={() => setEditingId(null)}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="border rounded overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 border-b">スコープ</th>
                  <th className="p-3 border-b">クレーム名</th>
                  <th className="p-3 border-b">ソース</th>
                  <th className="p-3 border-b">キー / 固定値</th>
                  <th className="p-3 border-b">操作</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-3 border-b">{m.scope}</td>
                    <td className="p-3 border-b">{m.claim_name}</td>
                    <td className="p-3 border-b">{getValueSourceLabel(m.value_source)}</td>
                    <td className="p-3 border-b">
                      {m.value_source === 'static' ? `Val: ${m.static_value}` : `Key: ${m.value_key}`}
                    </td>
                    <td className="p-3 border-b space-x-2">
                      <button onClick={() => handleEdit(m)} className="text-blue-600"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-600"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr>
                    <td className="p-3 text-sm text-gray-500" colSpan={5}>クレームマッピングがありません。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}