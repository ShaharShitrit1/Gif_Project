"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { wizardDict } from "@/lib/i18n/dict/wizard";

const STORAGE = "cr_user_api_key";

function readKey(): string {
  try {
    return localStorage.getItem(STORAGE) ?? "";
  } catch {
    return "";
  }
}

/**
 * Shown only when the site runs without its own AI key ("byok" mode): lets the visitor use
 * their own Claude API key so the site owner pays nothing. Without a key → demo report.
 */
export function ApiKeyBox() {
  const t = useT(wizardDict);
  const [mode, setMode] = useState<string | null>(null);
  // Nothing renders until /api/status answers, so reading localStorage here cannot cause a hydration mismatch.
  const [saved, setSaved] = useState(() => (typeof window === "undefined" ? "" : readKey()));
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "rejected" | "unreachable">("idle");

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { mode?: string }) => setMode(j.mode ?? null))
      .catch(() => setMode(null));
  }, []);

  if (mode !== "byok") return null;

  const save = async () => {
    const key = draft.trim();
    if (!key) return;
    setState("checking");
    try {
      const r = await fetch("/api/status", { method: "POST", headers: { "x-user-api-key": key } });
      const j = (await r.json()) as { valid?: boolean; reason?: string };
      if (!j.valid) return setState(j.reason === "unreachable" ? "unreachable" : "rejected");
      localStorage.setItem(STORAGE, key);
      setSaved(key);
      setDraft("");
      setState("idle");
    } catch {
      setState("unreachable");
    }
  };

  const remove = () => {
    try {
      localStorage.removeItem(STORAGE);
    } catch {}
    setSaved("");
  };

  return (
    <section className="mt-10 card-flat p-5" aria-labelledby="byok-label">
      <h3 id="byok-label" className="text-lg font-black">
        🔑 {t("byok_title")}
      </h3>
      {saved ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-2">
            ✅ {t("byok_saved")} <span dir="ltr" className="font-mono">…{saved.slice(-4)}</span>
          </p>
          <Button size="sm" variant="secondary" onClick={remove}>
            {t("byok_remove")}
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{t("byok_body")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setState("idle");
              }}
              placeholder="sk-ant-…"
              aria-label={t("byok_title")}
              className="h-11 min-w-0 flex-1 rounded-full border-2 border-line bg-surface px-4 font-mono text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            />
            <Button size="sm" className="h-11" onClick={save} disabled={!draft.trim() || state === "checking"}>
              {state === "checking" ? t("byok_checking") : t("byok_save")}
            </Button>
          </div>
          {state === "rejected" && <p className="mt-2 text-sm font-bold text-ember">{t("byok_rejected")}</p>}
          {state === "unreachable" && <p className="mt-2 text-sm font-bold text-ember">{t("byok_unreachable")}</p>}
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            {t("byok_note")}{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="font-bold underline">
              {t("byok_get")}
            </a>
          </p>
        </>
      )}
    </section>
  );
}
