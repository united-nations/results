"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OverviewFocus = {
  groupId?: string;
  subprogrammeId?: string;
  resultId?: string;
  title?: string;
  source?: string;
} & (
  | { kind: "priority"; priority: string; entityId?: never }
  | {
      kind: "entity" | "subprogramme" | "result";
      entityId: string;
      priority?: never;
    }
);

const FocusContext = createContext<{
  active: OverviewFocus | null;
  setLayer: (id: string, scope: OverviewFocus) => void;
  removeLayer: (id: string) => void;
} | null>(null);

export function OverviewFocusProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<{ id: string; scope: OverviewFocus }[]>(
    [],
  );
  const setLayer = useCallback((id: string, scope: OverviewFocus) => {
    setLayers((current) =>
      current.some((layer) => layer.id === id)
        ? current.map((layer) => (layer.id === id ? { id, scope } : layer))
        : [...current, { id, scope }],
    );
  }, []);
  const removeLayer = useCallback((id: string) => {
    setLayers((current) => current.filter((layer) => layer.id !== id));
  }, []);
  const value = useMemo(
    () => ({
      active: layers.at(-1)?.scope ?? null,
      setLayer,
      removeLayer,
    }),
    [layers, setLayer, removeLayer],
  );
  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
}

export function useCurrentOverviewFocus() {
  return useContext(FocusContext)?.active ?? null;
}

export function useOverviewFocus(scope: OverviewFocus | null, open: boolean) {
  const context = useContext(FocusContext);
  const id = useId();
  const setLayer = context?.setLayer;
  const removeLayer = context?.removeLayer;
  const {
    kind,
    priority,
    entityId,
    groupId,
    subprogrammeId,
    resultId,
    title,
    source,
  } = scope ?? {};
  useEffect(() => {
    if (!open || !kind || !setLayer || !removeLayer) return;
    if (kind === "priority" ? !priority : !entityId) return;
    setLayer(id, {
      ...(kind === "priority"
        ? { kind, priority: priority!, groupId }
        : { kind, entityId: entityId!, groupId }),
      subprogrammeId,
      resultId,
      title,
      source,
    });
    return () => removeLayer(id);
  }, [
    id,
    open,
    setLayer,
    removeLayer,
    kind,
    priority,
    entityId,
    groupId,
    subprogrammeId,
    resultId,
    title,
    source,
  ]);
}
