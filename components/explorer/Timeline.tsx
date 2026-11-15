"use client";

import { useMemo, useState } from "react";
import type { EphemerisResponse, Location } from "@/lib/models";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#1e2a37] bg-[#101820]/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#F1F0EB]">Linha temporal</h2>
          <p className="text-xs text-[#8FAFC7]">Comparação dos locais no mesmo instante, intervalo e passo de amostragem.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[11px] text-[#8FAFC7]">Início
            <input type="date" value={start} onChange={(e) => onRun(e.target.value, end, step)} className="mt-0.5 max-w-full rounded border border-[#2a3a4a] bg-[#0a1018] px-2 py-1 text-xs text-[#F1F0EB]" />
          </label>
          <label className="flex flex-col text-[11px] text-[#8FAFC7]">Fim
            <input type="date" value={end} onChange={(e) => onRun(start, e.target.value, step)} className="mt-0.5 max-w-full rounded border border-[#2a3a4a] bg-[#0a1018] px-2 py-1 text-xs text-[#F1F0EB]" />
          </label>
          <label className="flex flex-col text-[11px] text-[#8FAFC7]">Passo (h)
            <select value={step} onChange={(e) => onRun(start, end, Number(e.target.value))} className="mt-0.5 rounded border border-[#2a3a4a] bg-[#0a1018] px-2 py-1 text-xs text-[#F1F0EB]">
              {STEP_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button onClick={() => onRun(start, end, step)} disabled={loading || sites.length === 0} className="rounded bg-[#172B40] px-3 py-1.5 text-xs font-medium text-[#F1F0EB] hover:bg-[#1f3954] disabled:opacity-40">
            {loading ? "A analisar..." : "Analisar"}
          </button>
          <button onClick={onClear} disabled={loading} className="rounded border border-[#2a3a4a] px-3 py-1.5 text-xs text-[#D5D2C9] hover:bg-[#172B40] disabled:opacity-40">Limpar</button>
        </div>
      </div>

      {sites.length === 0 && <div className="rounded-lg border border-dashed border-[#2a3a4a] p-4 text-sm text-[#8FAFC7]">Selecione pelo menos um local para executar a análise temporal.</div>}
      {error && <div className="mb-3 rounded-lg border border-[#5a3a2a] bg-[#20140d] p-3 text-sm text-[#E89A55]">Erro na análise: {error}</div>}
      {loading && <div className="rounded-lg border border-[#2a3a4a] bg-[#0d1824] p-4 text-sm text-[#8FAFC7]">A obter e agregar resultados para os locais selecionados...</div>}

      {!loading && analysis && analysis.length > 0 && chartData.length > 0 && (
        <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <div className="mb-1 text-xs text-[#8FAFC7]">Elevação solar (°) ao longo do tempo</div>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#1e2a37" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#85847F", fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: "#85847F", fontSize: 10 }} unit="°" domain={[-90, 90]} width={36} />
                  <Tooltip contentStyle={{ background: "#101820", border: "1px solid #2a3a4a", color: "#F1F0EB" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {analysis.map((a) => (
                    <Line key={a.locationId} type="monotone" dataKey={`${a.locationId}:elev`} name={`${a.name || a.locationId} (elevação solar)`} stroke={a.color || "#8FAFC7"} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-1 text-xs text-[#8FAFC7]">Visibilidade da Terra (%) e janelas de comunicação</div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#1e2a37" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#85847F", fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: "#85847F", fontSize: 10 }} domain={[0, 100]} unit="%" width={36} />
                  <Tooltip contentStyle={{ background: "#101820", border: "1px solid #2a3a4a", color: "#F1F0EB" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {analysis.map((a) => (
                    <Line key={a.locationId + ":earth"} type="stepAfter" dataKey={`${a.locationId}:earth`} name={`${a.name || a.locationId} (Terra visível)`} stroke={a.color || "#8FAFC7"} strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="rounded-lg border border-[#2a3a4a] bg-[#0d1824] p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[#8FAFC7]">
                <span>Instante selecionado</span>
                <span className="font-mono text-[#F1F0EB]">{chartData[clampedCursor]?.label}</span>
              </div>
              <input type="range" min={0} max={chartData.length - 1} value={clampedCursor} onChange={(e) => setCursor(Number(e.target.value))} className="w-full" />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {analysis.map((a) => {
                  const p = a.points[clampedCursor];
                  if (!p) return null;
                  return (
                    <div key={a.locationId} className="rounded border border-[#2a3a4a] p-2 text-xs">
                      <div className="mb-1 flex items-center gap-2 font-medium" style={{ color: a.color || "#F1F0EB" }}><span className="h-2 w-2 rounded-full" style={{ background: a.color || "#85847F" }} />{a.name || a.locationId}</div>
                      <div className="text-[#D5D2C9]">Elevação solar: <span className="font-mono">{p.solarElevationDeg != null ? `${p.solarElevationDeg.toFixed(1)}°` : "N/D"}</span></div>
                      <div className="text-[#D5D2C9]">Terra visível: <span className="font-mono">{p.earthVisibility != null ? `${(p.earthVisibility <= 1 ? p.earthVisibility * 100 : p.earthVisibility).toFixed(0)}%` : "N/D"}</span></div>
                      <div className="text-[#D5D2C9]">Comunicação: <span className="font-mono">{p.commWindow == null ? "N/D" : p.commWindow ? "Sim" : "Não"}</span></div>
                      <div className="mt-1 text-[10px] text-[#6b7a8a]">Fonte: {p.source} · Qualidade: {p.quality != null ? `${Math.round(p.quality * 100)}%` : "N/D"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[11px] text-[#6b7a8a]">
            Nota: gráficos mostram apenas dados devolvidos pela análise. Séries marcadas como mock/sintéticas não representam medições científicas validadas.
          </div>
        </div>
      )}

      {!loading && analysis && analysis.length > 0 && chartData.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#2a3a4a] p-4 text-sm text-[#8FAFC7]">A análise não devolveu pontos para o intervalo selecionado.</div>
      )}
    </section>
  );
}
