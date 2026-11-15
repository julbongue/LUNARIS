"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBackendStatus, type BackendStatus, type ComponentState } from "@/lib/backend-status";

function dot(state: ComponentState | BackendStatus["api"]) {
  if (state === "operational" || state === "online") return "bg-emerald-400";
  if (state === "degraded" || state === "unknown") return "bg-amber-400";
  if (state === "unconfigured") return "bg-[#85847F]";
  return "bg-red-400";
}

function labelComp(state: ComponentState) {
  if (state === "operational") return "operacional";
  if (state === "unavailable") return "indisponível";
  return "desconhecido";
}

export function BackendStatusBadge() {
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchBackendStatus();
      setStatus(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const s = await fetchBackendStatus();
      if (!active) return;
      setStatus(s);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (!status) {
    return <div className="rounded-lg border border-[#2a3a4a] bg-[#0d1824] px-3 py-2 text-xs text-[#8FAFC7]">A verificar estado da API...</div>;
  }

  return (
    <div className="rounded-xl border border-[#1e2a37] bg-[#0d1824] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-[#F1F0EB]">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot(status.api)}`} />
          <span>Estado do backend</span>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="rounded border border-[#2a3a4a] px-2 py-1 text-[11px] text-[#D5D2C9] hover:bg-[#172B40] disabled:opacity-40">
          {loading ? "A verificar..." : "Atualizar"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[#8FAFC7]">{status.message}</p>
      <div className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2 rounded border border-[#2a3a4a] bg-[#101820] px-2 py-1.5">
          <span className="text-[#D5D2C9]">API</span>
          <span className="flex items-center gap-1.5 text-[#8FAFC7]"><span className={`h-2 w-2 rounded-full ${dot(status.api)}`} />{status.api}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-[#2a3a4a] bg-[#101820] px-2 py-1.5">
          <span className="text-[#D5D2C9]">Motor científico</span>
          <span className="flex items-center gap-1.5 text-[#8FAFC7]"><span className={`h-2 w-2 rounded-full ${dot(status.scientificEngine)}`} />{labelComp(status.scientificEngine)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-[#2a3a4a] bg-[#101820] px-2 py-1.5">
          <span className="text-[#D5D2C9]">Efemérides</span>
          <span className="flex items-center gap-1.5 text-[#8FAFC7]"><span className={`h-2 w-2 rounded-full ${dot(status.ephemerisProvider)}`} />{labelComp(status.ephemerisProvider)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-[#2a3a4a] bg-[#101820] px-2 py-1.5">
          <span className="text-[#D5D2C9]">DEM/Topografia</span>
          <span className="flex items-center gap-1.5 text-[#8FAFC7]"><span className={`h-2 w-2 rounded-full ${dot(status.dem)}`} />{labelComp(status.dem)}</span>
        </div>
      </div>
      {status.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-[#85847F]">
          {status.details.slice(0, 4).map((d, i) => <li key={i} className="break-words">• {d}</li>)}
        </ul>
      )}
      <div className="mt-2 text-[10px] text-[#6b7a8a]">Verificado: {new Date(status.checkedAt).toLocaleString()}</div>
    </div>
  );
}
