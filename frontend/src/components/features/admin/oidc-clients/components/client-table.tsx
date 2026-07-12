import { Edit2, KeyRound } from "lucide-react";
import React from "react";

import { OidcClient } from "@/types";

import { ClientTableHeader } from "./table-header";

export const ClientTable = ({
  clients,
  onEdit,
  onRotateSecret,
}: {
  clients: OidcClient[];
  onEdit: (client: OidcClient) => void;
  onRotateSecret: (clientId: string) => Promise<void>;
}) => {
  return (
    <div className="border rounded overflow-hidden bg-white">
      <table className="w-full text-left border-collapse">
        <ClientTableHeader />
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50">
              <td className="p-3 border-b">{client.name}</td>
              <td className="p-3 border-b font-mono text-sm">{client.client_id}</td>
              <td className="p-3 border-b font-mono text-sm">{client.client_secret_masked}</td>
              <td className="p-3 border-b text-sm">{client.scope_names.join(" ")}</td>
              <td className="p-3 border-b">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    client.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {client.is_active ? "有効" : "無効"}
                </span>
              </td>
              <td className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <button
                    className="text-blue-600"
                    onClick={() => onEdit(client)}
                    title="編集"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="text-amber-600"
                    onClick={() => onRotateSecret(client.client_id)}
                    title="シークレット再取得が必要な場合は再発行"
                  >
                    <KeyRound size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};