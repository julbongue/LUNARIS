"use client";

import { useMemo, useState } from "react";
import { Database, Globe2, History, LayoutDashboard, Map } from "lucide-react";
import { LocationsProvider, useLocations } from "@/components/explorer/LocationsContext";
import { Globe } from "@/components/explorer/Globe";
import { LocationPanel } from "@/components/explorer/LocationPanel";
import { ComparisonPanel } from "@/components/explorer/ComparisonPanel";
import { Timeline } from "@/components/explorer/Timeline";
import { analyzeLocations, getBackendMode } from "@/services/api";
import type { EphemerisResponse } from "@/lib/models";

type SectionId = "overview" | "explorer" | "comparison" | "history" | "data";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "overview", label: "Mission Overview", icon: LayoutDashboard },
  { id: "explorer", label: "Lunar Explorer", icon: Globe2 },
  { id: "comparison", label: "Site Comparison", icon: Map },
  { id: "history", label: "Analysis History", icon: History },
  { id: "data", label: "Data & Models", icon: Database },
];

export default function Page() {
  return (
    <LocationsProvider>
      <ExplorerShell />
    </LocationsProvider>
  );
}

function ExplorerShell() {
  const { sites } = useLocations();
  const [active, setActive] = useState<SectionId>("explorer");
  const [analysis, setAnalysis] = useState<EphemerisResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [step, setStep] = useState(6);
  const [history, setHistory] = useState<{ at: string; sites: string[]; start: string; end: string; step: number; mode: string }[]>([]);

  const backendMode = useMemo(() => getBackendMode(), []);

  const runAnalysis = async (s: string, e: string, st: number) => {
    if (sites.length === 0) return;
    setStart(s); setEnd(e); setStep(st);
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeLocations(sites, {
        locationIds: sites.map((x) => x.id),
        intervalStart: s,
        intervalEnd: e,
        stepHours: st,
      });
      setAnalysis(res);
      setHistory((h) => [{ at: new Date().toISOString(), sites: sites.map((x) => x.name), start: s, end: e, step: st, mode: backendMode }, ...h].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao executar análise.");
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => { setAnalysis(null); setError(null); };

  return (
    <div className="min-h-screen bg-[#0a1018] text-[#D5D2C9] lg:pl-[240px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-[#1e2a37] bg-[#101820] lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-[#1e2a37] px-4 py-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#172B40] text-sm font-bold text-[#8FAFC7]">L</span>
          <div>
            <div className="text-sm font-bold tracking-wide text-[#F1F0EB]">LUNARIS</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#6b7a8a]">Lunar Explorer</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${active === id ? "bg-[#172B40] text-[#F1F0EB] shadow-[inset_3px_0_0_#E89A55]" : "text-[#aeb9c4] hover:bg-[#162230] hover:text-[#F1F0EB]"}`}>
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-[#1e2a37] p-3 text-[10px] text-[#6b7a8a]">
          <div>Modo dados: <span className={backendMode === "live" ? "text-[#8FAFC7]" : "text-[#E89A55]"}>{backendMode}</span></div>
          <div>Base: {backendMode === "live" ? "API configurada" : "mock/sintético local"}</div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-[#1e2a37] bg-[#101820]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-[#F1F0EB]">{NAV.find((n) => n.id === active)?.label}</div>
              <div className="text-xs text-[#8FAFC7]">Exploração e análise lunar · até 3 locais em comparação</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8FAFC7]">
              <span className="rounded-full border border-[#2a3a4a] bg-[#0d1824] px-2.5 py-1">Locais: {sites.length}/3</span>
              <span className={`rounded-full border px-2.5 py-1 ${backendMode === "live" ? "border-[#2a3a4a] bg-[#0d1824] text-[#8FAFC7]" : "border-[#4a3522] bg-[#1d140c] text-[#E89A55]"}`}>{backendMode === "live" ? "Dados: API" : "Dados: mock/offline"}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs ${active === id ? "bg-[#172B40] text-[#F1F0EB]" : "text-[#8FAFC7]"}`}>{label}</button>
            ))}
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4">
          {active === "explorer" && (
            <>
              <div className="rounded-xl border border-[#1e2a37] bg-[#0d1824] px-4 py-3 text-sm text-[#D5D2C9]">
                <span className="font-medium text-[#F1F0EB]">Lunar Explorer:</span> selecione até três locais no globo ou no painel, execute a análise e compare visibilidade solar/terrestre, iluminação e janelas de comunicação no mesmo intervalo temporal.
              </div>
              <div className="grid min-w-0 gap-4 xl:grid-cols-[1.7fr_1fr]">
                <div className="min-h-[480px] min-w-0 xl:min-h-[620px]">
                  <Globe />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <LocationPanel />
                  <ComparisonPanel analysis={analysis} sites={sites} />
                </div>
              </div>
              <div className="min-w-0">
                <Timeline sites={sites} analysis={analysis} loading={loading} error={error} start={start} end={end} step={step} onRun={runAnalysis} onClear={clearAnalysis} />
              </div>
            </>
          )}

          {active === "overview" && (
            <section className="grid gap-4 md:grid-cols-2">
              <InfoCard title="Objetivo" text="Ferramenta de exploração e análise lunar para comparar condições científicas de até três locais, com base em dados fornecidos pela API LUNARIS quando disponíveis." />
              <InfoCard title="Estado da integração" text={`Modo atual: ${backendMode}. Em modo offline, séries temporais são sintéticas (mock) para validação da interface; não devem ser interpretadas como medições científicas.`} />
              <InfoCard title="Experiência principal" text="Use o Lunar Explorer para interagir com o globo 3D, selecionar locais, definir intervalo/passo temporal e comparar resultados lado a lado." />
              <InfoCard title="Limitações atuais" text="Sem contrato backend (docs/frontend/contract.md) no repositório: integração live tenta endpoint genérico e degrada para 'Indisponível' quando necessário. Nenhum valor científico é inventado." />
            </section>
          )}

          {active === "comparison" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e2a37] bg-[#0d1824] px-4 py-3 text-sm text-[#8FAFC7]">Comparação detalhada dos últimos resultados analisados no Lunar Explorer.</div>
              <ComparisonPanel analysis={analysis} sites={sites} />
            </div>
          )}

          {active === "history" && (
            <section className="rounded-2xl border border-[#1e2a37] bg-[#101820]/80 p-4">
              <h2 className="mb-3 text-sm font-semibold text-[#F1F0EB]">Analysis History (sessão)</h2>
              {history.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#2a3a4a] p-4 text-sm text-[#8FAFC7]">Nenhuma análise executada nesta sessão.</div>
              ) : (
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i} className="rounded-lg border border-[#2a3a4a] bg-[#0d1824] p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[#F1F0EB]">{new Date(h.at).toLocaleString()} · <span className="text-[#8FAFC7]">{h.mode}</span></div>
                        <div className="font-mono text-xs text-[#8FAFC7]">{h.start} → {h.end} · passo {h.step}h</div>
                      </div>
                      <div className="mt-1 text-xs text-[#D5D2C9]">Locais: {h.sites.join(", ") || "—"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {active === "data" && (
            <section className="grid gap-4 md:grid-cols-2">
              <InfoCard title="Fontes visuais" text="Globo 3D utiliza texturas lunares públicas de three.js (derivadas de NASA/USGS LRO) para visualização. A textura é ilustrativa e distinta dos dados científicos calculados pelo backend." />
              <InfoCard title="Modelos e proveniência" text="Cada resultado deve indicar fonte (real/mock/sintético/indisponível), qualidade e proveniência quando fornecidos pela API. O frontend não calcula métricas científicas." />
              <InfoCard title="Contrato/API" text="docs/frontend/contract.md não encontrado neste repositório. A integração live é defensiva: chamadas independentes por local, agregação no frontend e degradação para 'Não disponível' em falhas." />
              <InfoCard title="Catálogo de referência" text="Inclui locais de referência (ex.: Shackleton, Mare Tranquillitatis, Tycho) para navegação rápida; coordenadas são indicativas e podem ser editadas pelo utilizador." />
            </section>
          )}
        </main>

        <footer className="border-t border-[#1e2a37] px-4 py-3 text-[11px] text-[#6b7a8a]">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
            <span>LUNARIS · Lunar Explorer</span>
            <span>Identificação de dados: real / mock / sintético / indisponível</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-[#1e2a37] bg-[#101820]/80 p-4">
      <h3 className="mb-1 text-sm font-semibold text-[#F1F0EB]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#8FAFC7]">{text}</p>
    </article>
  );
}
