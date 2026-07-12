/**
 * @file frontend/src/components/features/register/useSuccessRedirect.ts
 * @description 登録成功後の遅延リダイレクトを管理する共通フック。
 */
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * 成功時の遅延遷移を管理する。
 * タイマーはアンマウント時に必ず破棄し、副作用の取り残しを防ぐ。
 */
export function useSuccessRedirect() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const redirectAfter = useCallback(
    (path: string, delayMs: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        router.replace(path);
      }, delayMs);
    },
    [router],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { redirectAfter };
}
