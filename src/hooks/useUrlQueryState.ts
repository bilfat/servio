"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

export interface UrlQueryManager {
  getParam: (key: string, defaultValue?: string) => string;
  setParam: (key: string, value: string | null) => void;
  setMultipleParams: (updates: Record<string, string | null>) => void;
  clearAllParams: () => void;
  searchParams: ReturnType<typeof useSearchParams>;
  isPending: boolean;
}

/**
 * Hook for syncing filter & search state with URL query parameters (ROOT-06)
 */
export function useUrlQueryState(): UrlQueryManager;
export function useUrlQueryState<T extends string = string>(key: string, defaultValue?: T): [T, (value: T) => void];
export function useUrlQueryState<T extends string = string>(
  key?: string,
  defaultValue?: T
): UrlQueryManager | [T, (value: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const getParam = useCallback(
    (paramKey: string, defaultVal: string = ""): string => {
      return searchParams.get(paramKey) || defaultVal;
    },
    [searchParams]
  );

  const setParam = useCallback(
    (paramKey: string, value: string | null) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (!value || value === "ALL" || value === "") {
        current.delete(paramKey);
      } else {
        current.set(paramKey, value);
      }
      const search = current.toString();
      const query = search ? `?${search}` : "";
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const setMultipleParams = useCallback(
    (updates: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      Object.entries(updates).forEach(([k, value]) => {
        if (!value || value === "ALL" || value === "") {
          current.delete(k);
        } else {
          current.set(k, value);
        }
      });
      const search = current.toString();
      const query = search ? `?${search}` : "";
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const clearAllParams = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [router, pathname]);

  if (key) {
    const rawVal = searchParams.get(key);
    const value = (rawVal !== null ? rawVal : (defaultValue ?? "")) as T;
    const setValue = (val: T) => setParam(key, val);
    return [value, setValue];
  }

  return {
    getParam,
    setParam,
    setMultipleParams,
    clearAllParams,
    searchParams,
    isPending,
  };
}
