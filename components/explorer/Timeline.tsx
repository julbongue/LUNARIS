"use client";

import { useMemo, useState } from "react";
import type { EphemerisResponse, Location } from "@/lib/models";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  sites: Location[];
  analysis: EphemerisResponse[] | null;
  loading: boolean;
  error: string | null;
  start: string;
  end: string;
  step: number;
  onRun: (start: string, end: string, step: number) => void;
  onClear: () => void;
}

const STEP_OPTIONS = [1, 3, 6, 12, 24];

export function Timeline({ sites, analysis, loading, error, start, end, step, onRun, onClear }: Props) {
  const { t } = useI18n();
  const [cursor, setCursor] = useState<number>(0);

  const chartData = useMemo(() => {
    if (!analysis || analysis.length === 0) return [];
    const maxLen = Math.max(...analysis.map((a) => a.points.length));
    const data: Array<Record<string, string | number | null>> = [];
    for (let i = 0; i < maxLen; i++) {
      const row: Record<string, string | number | null> = { index: i };
      let label = "";
      for (const a of analysis) {
        const p = a.points[i];
        if (p) {
          row[`${a.locationId}:elev`] = p.solarElevationDeg;
          row[`${a.locationId}:earth`] = p.earthVisibility != null ? (p.earthVisibility <= 1 ? p.earthVisibility * 100 : p.earthVisibility) : null;
          row[`${a.locationId}:comm`] = p.commWindow ? 1 : 0;
          if (!label) label = new Date(p.instant).toISOString().slice(0, 16).replace("T", " ");
        }
      }
      row.label = label || String(i);
      data.push(row);
    }
    return data;
  }, [analysis]);

  const clampedCursor = Math.min(cursor, Math.max(0, chartData.length - 1));
  const inputCls = "mt-0.5 max-w-full rounded border border-lunar-border-strong bg-lunar-bg px-2 py-1 text-xs text-lunar-text-strong";

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-lunar-border bg-lunar-surface/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-lunar-text-strong">{t.timeline.title}</h2>
          <p className="text-xs text-lunar-text-muted">{t.timeline.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[11px] text-lunar-text-muted">{t.timeline.start}
            <input type="date" value={start} onChange={(e) => onRun(e.target.value, end, step)} className={inputCls} />
          </label>
          <label className="flex flex-col text-[11px] text-lunar-text-muted">{t.timeline.end}
            <input type="date" value={end} onChange={(e) => onRun(start, e.target.value, step)} className={inputCls} />
          </label>
          <label className="flex flex-col text-[11px] text-lunar-text-muted">{t.timeline.step}
            <select value={step} onChange={(e) => onRun(start, end, Number(e.target.value))} className={inputCls}>
              {STEP_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button onClick={() => onRun(start, end, step)} disabled={loading || sites.length === 0} className="rounded bg-lunar-surface-3 px-3 py-1.5 text-xs font-medium text-lunar-text-strong hover:opacity-90 disabled:opacity-40">
            {loading ? t.common.analyzing : t.common.analyze}
          </button>
          <button onClick={onClear} disabled={loading} className="rounded border border-lunar-border-strong px-3 py-1.5 text-xs text-lunar-text hover:bg-lunar-surface-3 disabled:opacity-40">{t.common.clear}</button>
        </div>
      </div>

      {sites.length === 0 && <div className="rounded-lg border border-dashed border-lunar-border-strong p-4 text-sm text-lunar-text-muted">{t.timeline.selectSitePrompt}</div>}
      {error && <div className="mb-3 rounded-lg border border-lunar-signal/40 bg-lunar-signal/10 p-3 text-sm text-lunar-signal">{t.timeline.errorPrefix} {error}</div>}
      {loading && <div className="rounded-lg border border-lunar-border-strong bg-lunar-surface-2 p-4 text-sm text-lunar-text-muted">{t.timeline.loading}</div>}

      {!loading && analysis && analysis.length > 0 && chartData.length > 0 && (
        <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <div className="mb-1 text-xs text-lunar-text-muted">{t.timeline.solarElevationChart}</div>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="var(--lunar-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "var(--lunar-text-faint)", fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: "var(--lunar-text-faint)", fontSize: 10 }} unit="°" domain={[-90, 90]} width={36} />
                  <Tooltip contentStyle={{ background: "var(--lunar-surface)", border: "1px solid var(--lunar-border-strong)", color: "var(--lunar-text-strong)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {analysis.map((a) => (
                    <Line key={a.locationId} type="monotone" dataKey={`${a.locationId}:elev`} name={`${a.name || a.locationId} (${t.timeline.seriesElevation})`} stroke={a.color || "#8FAFC7"} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-1 text-xs text-lunar-text-muted">{t.timeline.earthVisibilityChart}</div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="var(--lunar-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "var(--lunar-text-faint)", fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: "var(--lunar-text-faint)", fontSize: 10 }} domain={[0, 100]} unit="%" width={36} />
                  <Tooltip contentStyle={{ background: "var(--lunar-surface)", border: "1px solid var(--lunar-border-strong)", color: "var(--lunar-text-strong)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {analysis.map((a) => (
                    <Line key={a.locationId + ":earth"} type="stepAfter" dataKey={`${a.locationId}:earth`} name={`${a.name || a.locationId} (${t.timeline.seriesEarth})`} stroke={a.color || "#8FAFC7"} strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="rounded-lg border border-lunar-border-strong bg-lunar-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-lunar-text-muted">
                <span>{t.timeline.selectedInstant}</span>
                <span className="font-mono text-lunar-text-strong">{chartData[clampedCursor]?.label}</span>
              </div>
              <input type="range" min={0} max={chartData.length - 1} value={clampedCursor} onChange={(e) => setCursor(Number(e.target.value))} className="w-full accent-[var(--lunar-accent)]" />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {analysis.map((a) => {
                  const p = a.points[clampedCursor];
                  if (!p) return null;
                  return (
                    <div key={a.locationId} className="rounded border border-lunar-border-strong p-2 text-xs">
                      <div className="mb-1 flex items-center gap-2 font-medium" style={{ color: a.color || "var(--lunar-text-strong)" }}><span className="h-2 w-2 rounded-full" style={{ background: a.color || "#85847F" }} />{a.name || a.locationId}</div>
                      <div className="text-lunar-text">{t.timeline.solarElevation}: <span className="font-mono">{p.solarElevationDeg != null ? `${p.solarElevationDeg.toFixed(1)}°` : "N/D"}</span></div>
                      <div className="text-lunar-text">{t.timeline.earthVisible}: <span className="font-mono">{p.earthVisibility != null ? `${(p.earthVisibility <= 1 ? p.earthVisibility * 100 : p.earthVisibility).toFixed(0)}%` : "N/D"}</span></div>
                      <div className="text-lunar-text">{t.timeline.communication}: <span className="font-mono">{p.commWindow == null ? "N/D" : p.commWindow ? t.common.yes : t.common.no}</span></div>
                      <div className="mt-1 text-[10px] text-lunar-text-faint">{t.timeline.source}: {t.source[p.source as keyof typeof t.source] || p.source} · {t.timeline.quality}: {p.quality != null ? `${Math.round(p.quality * 100)}%` : "N/D"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[11px] text-lunar-text-faint">{t.timeline.note}</div>
        </div>
      )}

      {!loading && analysis && analysis.length > 0 && chartData.length === 0 && (
        <div className="rounded-lg border border-dashed border-lunar-border-strong p-4 text-sm text-lunar-text-muted">{t.timeline.noPoints}</div>
      )}
    </section>
  );
}
