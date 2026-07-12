/**
 * @file src/components/features/devices/useDevicesList.ts
 * @description デバイス一覧の取得と表示状態管理を行うカスタムフーク。
 */

import { useEffect, useState } from "react";

import { fetchDeviceCredentials } from "@/lib/api/devices";
import { getErrorMessage } from "@/lib/error";
import type { DeviceCredential } from "@/types";

/**
 * デバイス一覧の取得と表示状態管理を行うカスタムフーク。
 * @returns [devices, loading, error] の3要素を返す
 */
export function useDevicesList() {
  const [devices, setDevices] = useState<DeviceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchDeviceCredentials()
      .then((rows) => {
        if (!isMounted) return;
        setDevices(rows);
      })
      .catch((e) => {
        if (!isMounted) return;
        const errorMessage = getErrorMessage(e, "デバイス一覧の取得に失敗しました");
        setError(errorMessage);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return [devices, loading, error] as const;
}