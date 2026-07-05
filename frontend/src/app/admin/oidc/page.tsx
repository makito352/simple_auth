"use client";
/**
 * @file page.tsx
 * @description OIDCクレームマッピングの管理画面
 */
import React, { useState, useEffect } from 'react';
import { ClaimMapping, ClaimMappingInput, OptionAttribute } from '@/types';
import { fetchClaimMappings, createClaimMapping, updateClaimMapping, deleteClaimMapping } from '@/lib/api/oidc';
import { fetchOptionAttributes } from '@/lib/api/user_options';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OidcManagementPage() {
  const [mappings, setMappings] = useState<ClaimMapping[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<OptionAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClaimMappingInput>({
    scope: '',
    claim_name: '',
    value_source: 'static',
    value_key: '',
    static_value: '',
  });

  // データ取得
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mappingsData, attributesData] = await Promise.all([
          fetchClaimMappings(),
          fetchOptionAttributes(),
        ]);
        setMappings(mappingsData);
        setAttributeOptions(attributesData);
      } catch (error) {
        console.error("Failed to fetch mappings or attributes", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 保存処理（新規・更新共通）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId === "new") {
        await createClaimMapping(formData);
        toast.success("新しく追加しました");
      } else if (editingId) {
        await updateClaimMapping(editingId, formData);
        toast.success("マッピングを更新しました");
      }
      window.location.reload();
    } catch (error) {
      toast.error("保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('このマッピングを削除してもよろしいですか？')) {
      try {
        await deleteClaimMapping(id);
        setMappings(mappings.filter(m => m.id !== id));
        toast.success("削除しました"); // 追加
      } catch (error) {
        toast.error("削除に失敗しました"); // エラーハンドリングの追加
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
        <h1 className="text-2xl font-bold">OIDCクレームマッピング設定</h1>
        <button 
          onClick={() => { setEditingId("new"); setFormData({ scope: '', claim_name: '', value_source: 'static', value_key: '', static_value: '' }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus size={18} /> 新規追加
        </button>
      </div>

      {/* 登録フォーム（編集時または新規作成時に表示） */}
      {editingId && (
        <div className="bg-white p-6 border rounded shadow-sm">
          <h2 className="border-b pb-2 mb-4">{editingId === "new" ? '新規追加' : 'マッピングの編集'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">スコープ</label>
              <input 
                className="border p-2 w-full rounded"
                value={formData.scope}
                onChange={e => setFormData({...formData, scope: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm">クレーム名</label>
              <input 
                className="border p-2 w-full rounded"
                value={formData.claim_name}
                onChange={e => setFormData({...formData, claim_name: e.target.value})}
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
            <div className="flex items-end">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* リスト表示 */}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}