import type { DeviceCredential } from "@/types";

/**
 * デバイスの1行分をレンダリングするコンポーネント。
 * @param props 
 * @param {DeviceCredential} props.device - デバイス情報
 * @param {string | null} props.savingId - 現在保存中のID
 * @param {string | null} props.deletingId - 現在削除中のID
 * @param {Record<string, string>} props.commentDrafts - 入力中のドラフト
 * @param {(id: string, val: string) => void} props.onCommentChange - コメント入力時のコールバック
 * @param {(id: string) => void} props.onSaveAction - 保存ボタン押下時
 * @param {(id: string) => void} props.onDeleteAction - 削除ボタン押下時
 */
export const DeviceRow = ({
  device,
  savingId,
  deletingId,
  commentDrafts,
  onSaveAction,
  onDeleteAction,
  onCommentChange,
}: {
  device: DeviceCredential;
  savingId: string | null;
  deletingId: string | null;
  commentDrafts: Record<string, string>;
  onSaveAction: (id: string) => void;
  onDeleteAction: (id: string) => void;
  onCommentChange: (id: string, val: string) => void;
}) => {
  const isSaving = savingId === device.credential_id;
  const isDeleting = deletingId === device.credential_id;

  return (
    <tr className="border-b border-gray-200">
      <td className="border border-gray-300 p-2">{device.device_name ?? "Unknown"}</td>
      <td className="border border-gray-300 p-2">
        {new Date(device.created_at).toLocaleString("ja-JP")}
      </td>
      <td className="border border-gray-300 p-2">
        <input
          type="text"
          value={commentDrafts[device.credential_id] ?? ""}
          onChange={(e) => onCommentChange(device.credential_id, e.target.value)}
          maxLength={255}
          placeholder="例: WindowsメインPC"
          disabled={isDeleting}
          className="w-full min-w-[240px] p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
        />
      </td>
      <td className="border border-gray-300 p-2">
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => onSaveAction(device.credential_id)}
            disabled={isSaving || isDeleting}
            className={`px-3 py-1 rounded ${isSaving ? "bg-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
          <button 
            type="button" 
            onClick={() => onDeleteAction(device.credential_id)}
            disabled={isSaving || isDeleting}
            className={`px-3 py-1 rounded ${isDeleting ? "bg-gray-400" : "bg-red-600 text-white hover:bg-red-700"}`}
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </td>
    </tr>
  );
};