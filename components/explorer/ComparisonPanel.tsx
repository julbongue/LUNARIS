"use client";

import { useMemo } from "react";
import type { EphemerisPoint, EphemerisResponse, Location } from "@/lib/models";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface Props {
  analysis: EphemerisResponse[] | null;
  sites: Location[];
}

const SOURCE_LABEL: Record<string, string> = {
  real: "Real",
  mock: "Mock",
  unavailable: "Indisponível",
  synthetic: "Sintético",
};

function fmtNum(v: number | null | undefined, unit = "", digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "Não disponível";
  return `${v.toFixed(digits)}${unit}`;
}
function fmtPct01(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "Não disponível";
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(0)}%`;
}

function summarize(points: EphemerisPoint[]) {
  if (!points.length) return null;
  const avg = (sel: (p: EphemerisPoint) => number | null) => {
    const vals = points.map(sel).filter((v): v is number => v != null && Number.isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const comm = points.filter((p) => p.commWindow === true).length;
  return {
    solarElev: avg((p) => p.solarElevationDeg),
    solarAz: avg((p) => p.solarAzimuthDeg),
    earthElev: avg((p) => p.earthElevationDeg),
    earthVis: avg((p) => p.earthVisibility),
    solarVis: avg((p) => p.solarVisibility),
    horizon: avg((p) => p.horizonOcclusion),
    distance: avg((p) => p.distanceKm),
    commCount: comm,
    total: points.length,
  };
}

export function ComparisonPanel({ analysis, sites }: Props) {
  const rows = useMemo(() => {
    if (!analysis) return [];
    return analysis.map((a) => {
      const site = sites.find((s) => s.id === a.locationId);
      return { a, site, summary: summarize(a.points) };
    });
  }, [analysis, sites]);

  return (
    <section className="min-w-0 rounded-2xl border border-[#1e2a37] bg-[#101820]/80 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[#F1F0EB]">Comparação científica</h2>
        <p className="text-xs text-[#8FAFC7]">Resultados por local, sincronizados no mesmo intervalo e passo. Valores dependem da disponibilidade da API.</p>
      </div>

      {!analysis || analysis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2a3a4a] p-4 text-sm text-[#8FAFC7]">
          Sem resultados. Selecione locais e execute uma análise na linha temporal para comparar condições.
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {rows.map(({ a, site, summary }) => (
            <article key={a.locationId} className="min-w-0 rounded-xl border border-[#2a3a4a] bg-[#0d1824] p-3">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#2a3a4a] pb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color || site?.color || "#85847F" }} />
                    <span className="truncate text-sm font-medium text-[#F1F0EB]">{a.name || site?.name || a.locationId}</span>
                  </div>
                  <div className="truncate text-[11px] text-[#6b7a8a]">{site ? `${site.latitude.toFixed(3)}, ${site.longitude.toFixed(3)} · ${site.coordinateSystem}` : "Local"}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.source === "real" ? "bg-[#172B40] text-[#8FAFC7]" : a.source === "mock" ? "bg-[#2a2418] text-[#E89A55]" : "bg-[#1a1f24] text-[#85847F]"}`}>
                  {SOURCE_LABEL[a.source] || a.source}
                </span>
              </div>

              {!summary ? (
                <div className="break-words text-xs text-[#8FAFC7]">{a.note || "Sem pontos disponíveis para o intervalo selecionado."}</div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <Row label="Visibilidade do Sol (média)" value={fmtPct01(summary.solarVis)} />
                  <Row label="Elevação solar (média)" value={fmtNum(summary.solarElev, "°")} />
                  <Row label="Azimute solar (média)" value={fmtNum(summary.solarAz, "°")} />
                  <Row label="Elevação da Terra (média)" value={fmtNum(summary.earthElev, "°")} />
                  <Row label="Visibilidade da Terra (média)" value={fmtPct01(summary.earthVis)} />
                  <Row label="Distância (média)" value={fmtNum(summary.distance, " km", 0)} />
                  <Row label="Obstrução do horizonte (média)" value={fmtNum(summary.horizon, "", 2)} />
                  <Row label="Janelas de comunicação" value={summary.total ? `${summary.commCount}/${summary.total} amostras` : "Não disponível"} />
                  <Row label="Iluminação (última amostra)" value={a.points[a.points.length - 1]?.illuminationCondition ?? "Não disponível"} />
                </div>
              )}

              {a.points.length > 1 && (
                <div className="mt-3 h-16 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={a.points.map((p, i) => ({ i, v: p.solarElevationDeg ?? 0 }))}>
                      <Area type="monotone" dataKey="v" stroke={a.color || site?.color || "#8FAFC7"} fill={a.color || site?.color || "#8FAFC7"} fillOpacity={0.15} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-3 border-t border-[#2a3a4a] pt-2 text-[11px] text-[#6b7a8a]">
                <div>Qualidade: {a.quality != null ? `${Math.round(a.quality * 100)}%` : "Não disponível"}</div>
                <div className="break-words">Proveniência: {a.provenance?.length ? a.provenance[0] : a.note || "Não disponível"}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="min-w-0 flex-1 text-[#8FAFC7]">{label}</span>
      <span className="shrink-0 text-right font-mono text-[#F1F0EB]">{value}</span>
    </div>
  );
}
