"use client";

import { useMemo } from "react";
import type { EphemerisPoint, EphemerisResponse, Location } from "@/lib/models";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  analysis: EphemerisResponse[] | null;
  sites: Location[];
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
  const { t, tr } = useI18n();

  const fmtNum = (v: number | null | undefined, unit = "", digits = 1): string => {
    if (v == null || !Number.isFinite(v)) return t.common.notAvailable;
    return `${v.toFixed(digits)}${unit}`;
  };
  const fmtPct01 = (v: number | null | undefined): string => {
    if (v == null || !Number.isFinite(v)) return t.common.notAvailable;
    const pct = v <= 1 ? v * 100 : v;
    return `${pct.toFixed(0)}%`;
  };

  const rows = useMemo(() => {
    if (!analysis) return [];
    return analysis.map((a) => {
      const site = sites.find((s) => s.id === a.locationId);
      return { a, site, summary: summarize(a.points) };
    });
  }, [analysis, sites]);

  return (
    <section className="min-w-0 rounded-2xl border border-lunar-border bg-lunar-surface/80 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-lunar-text-strong">{t.comparison.title}</h2>
        <p className="text-xs text-lunar-text-muted">{t.comparison.subtitle}</p>
      </div>

      {!analysis || analysis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-lunar-border-strong p-4 text-sm text-lunar-text-muted">
          {t.comparison.empty}
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {rows.map(({ a, site, summary }) => {
            const sourceLabel = t.source[a.source as keyof typeof t.source] || a.source;
            return (
              <article key={a.locationId} className="min-w-0 rounded-xl border border-lunar-border-strong bg-lunar-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-lunar-border-strong pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color || site?.color || "#85847F" }} />
                      <span className="truncate text-sm font-medium text-lunar-text-strong">{a.name || site?.name || a.locationId}</span>
                    </div>
                    <div className="truncate text-[11px] text-lunar-text-faint">{site ? `${site.latitude.toFixed(3)}, ${site.longitude.toFixed(3)} · ${site.coordinateSystem}` : ""}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.source === "real" ? "bg-lunar-surface-3 text-lunar-accent" : a.source === "mock" ? "bg-lunar-signal/15 text-lunar-signal" : "bg-lunar-surface text-lunar-text-faint"}`}>
                    {sourceLabel}
                  </span>
                </div>

                {!summary ? (
                  <div className="break-words text-xs text-lunar-text-muted">{a.note || t.comparison.noPointsForInterval}</div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    <Row label={t.comparison.metrics.solarVisAvg} value={fmtPct01(summary.solarVis)} />
                    <Row label={t.comparison.metrics.solarElevAvg} value={fmtNum(summary.solarElev, "°")} />
                    <Row label={t.comparison.metrics.solarAzAvg} value={fmtNum(summary.solarAz, "°")} />
                    <Row label={t.comparison.metrics.earthElevAvg} value={fmtNum(summary.earthElev, "°")} />
                    <Row label={t.comparison.metrics.earthVisAvg} value={fmtPct01(summary.earthVis)} />
                    <Row label={t.comparison.metrics.distanceAvg} value={fmtNum(summary.distance, " km", 0)} />
                    <Row label={t.comparison.metrics.horizonAvg} value={fmtNum(summary.horizon, "", 2)} />
                    <Row label={t.comparison.metrics.commWindows} value={summary.total ? tr(t.comparison.samples, { count: summary.commCount, total: summary.total }) : t.common.notAvailable} />
                    <Row label={t.comparison.metrics.illuminationLast} value={a.points[a.points.length - 1]?.illuminationCondition ?? t.common.notAvailable} />
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

                <div className="mt-3 border-t border-lunar-border-strong pt-2 text-[11px] text-lunar-text-faint">
                  <div>{t.comparison.quality}: {a.quality != null ? `${Math.round(a.quality * 100)}%` : t.common.notAvailable}</div>
                  <div className="break-words">{t.comparison.provenance}: {a.provenance?.length ? a.provenance[0] : a.note || t.common.notAvailable}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="min-w-0 flex-1 text-lunar-text-muted">{label}</span>
      <span className="shrink-0 text-right font-mono text-lunar-text-strong">{value}</span>
    </div>
  );
}
