"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ShareDialog } from "./ShareDialog";

export type ShareTarget = { kind: "group" } | { kind: "member"; id: string };

const Ctx = createContext<(t: ShareTarget) => void>(() => {});

/** Wraps the report: any child can call useShare()(target) to open the preview + share sheet. */
export function ShareProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const open = useCallback((t: ShareTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);
  const value = useMemo(() => open, [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ShareDialog target={target} onClose={close} />
    </Ctx.Provider>
  );
}

export function useShare() {
  return useContext(Ctx);
}
