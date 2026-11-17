"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/paths";

export function usePublicJson<T>(path: string) {
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    failed?: boolean;
  }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    fetch(withBasePath(path), { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load data");
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (!request.signal.aborted) setResult({ path, data });
      })
      .catch(() => {
        if (!request.signal.aborted) setResult({ path, failed: true });
      });
    return () => request.abort();
  }, [path, attempt]);
  const current = result?.path === path ? result : undefined;
  return {
    data: current?.data,
    failed: current?.failed,
    retry: () => {
      setResult(undefined);
      setAttempt(attempt + 1);
    },
  };
}
