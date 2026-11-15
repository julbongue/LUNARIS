"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBackendStatus, type BackendStatus, type ComponentState } from "@/lib/backend-status";
import { useI18n } from "@/lib/i18n/provider";

function dotClass(state: ComponentState | BackendStatus["api"]) {
  if (state === "operational" || state === "online") return "bg-emerald-500";
  if (state === "degraded" || state === "unknown") return "bg-amber-500";
  if (state === "unconfigured") return "bg-lunar-text-faint";
  return "bg-red-500";
}

export function BackendStatusBadge() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchBackendStatus(t);
      setStatus(s);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    (async () => {
      const s = await fetchBackendStatus(t);
      if (!active) return;
      setStatus(s);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [t]);

  const labelComp = (state: ComponentState) => t.backend.states[state];
  const labelApi = (state: BackendStatus["api"]) => t.backend.states[state];

  if (!status) {
    return <div className="rounded-lg border border-lunar-border-strong bg-lunar-surface-2 px-3 py-2 text-xs text-lunar-text-muted">{t.backend.verifying}</div>;
  }

  const rows: { label: string; state: ComponentState | BackendStatus["api"]; text: string }[] = [
    { label: t.backend.api, state: status.api, text: labelApi(status.api) },
    { label: t.backend.scientificEngine, state: status.scientificEngine, text: labelComp(status.scientificEngine) },
    { label: t.backend.ephemeris, state: status.ephemerisProvider, text: labelComp(status.ephemerisProvider) },
    { label: t.backend.dem, state: status.dem, text: labelComp(status.dem) },
  ];

  return (
    <div className="rounded-xl border border-lunar-border bg-lunar-surface-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-lunar-text-strong">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(status.api)}`} />
          <span>{t.backend.statusTitle}</span>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="rounded border border-lunar-border-strong px-2 py-1 text-[11px] text-lunar-text hover:bg-lunar-surface-3 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {loading ? t.common.checking : t.common.refresh}
        </button>
      </div>
      <p className="mt-1 text-xs text-lunar-text-muted">{status.message}</p>
      <div className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2 rounded border border-lunar-border-strong bg-lunar-surface px-2 py-1.5">
            <span className="text-lunar-text">{r.label}</span>
            <span className="flex items-center gap-1.5 text-lunar-text-muted"><span className={`h-2 w-2 rounded-full ${dotClass(r.state)}`} />{r.text}</span>
          </div>
        ))}
      </div>
      {status.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-lunar-text-faint">
          {status.details.slice(0, 4).map((d, i) => <li key={i} className="break-words">• {d}</li>)}
        </ul>
      )}
      <div className="mt-2 text-[10px] text-lunar-text-faint">{t.backend.verified}: {new Date(status.checkedAt).toLocaleString(locale)}</div>
    </div>
  );
}
