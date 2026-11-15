"use client";

import { useMemo, useState } from "react";
import { Database, Globe2, History, LayoutDashboard, Map } from "lucide-react";
import { LocationsProvider, useLocations } from "@/components/explorer/LocationsContext";
import { Globe } from "@/components/explorer/Globe";
import { LocationPanel } from "@/components/explorer/LocationPanel";
import { ComparisonPanel } from "@/components/explorer/ComparisonPanel";
import { Timeline } from "@/components/explorer/Timeline";
import { BackendStatusBadge } from "@/components/explorer/BackendStatusBadge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { analyzeLocations, getApiDisplayBase, isApiConfigured } from "@/services/api";
import { useI18n } from "@/lib/i18n/provider";
import type { EphemerisResponse } from "@/lib/models";

type SectionId = "overview" | "explorer" | "comparison" | "history" | "data";

export default function Page() {
  return (
    <LocationsProvider>
      <ExplorerShell />
    </LocationsProvider>
  );
}

function ExplorerShell() {
  const { t, tr } = useI18n();
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

  const apiConfigured = useMemo(() => isApiConfigured(), []);
  const apiBase = useMemo(() => getApiDisplayBase(), []);

  const NAV = [
    { id: "overview" as SectionId, label: t.nav.overview, icon: LayoutDashboard },
    { id: "explorer" as SectionId, label: t.nav.explorer, icon: Globe2 },
    { id: "comparison" as SectionId, label: t.nav.comparison, icon: Map },
    { id: "history" as SectionId, label: t.nav.history, icon: History },
    { id: "data" as SectionId, label: t.nav.data, icon: Database },
  ];

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
      }, { apiErrors: t.apiErrors, apiErrorMessages: t.apiErrors });
      setAnalysis(res);
      setHistory((h) => [{ at: new Date().toISOString(), sites: sites.map((x) => x.name), start: s, end: e, step: st, mode: apiConfigured ? "live" : "unconfigured" }, ...h].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.apiErrors.analysisFailed);
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => { setAnalysis(null); setError(null); };

  return (
    <div className="min-h-screen bg-lunar-bg text-lunar-text lg:pl-[240px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-lunar-border bg-lunar-surface lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-lunar-border px-4 py-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lunar-surface-3 text-sm font-bold text-lunar-accent">L</span>
          <div>
            <div className="text-sm font-bold tracking-wide text-lunar-text-strong">{t.common.appName}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-lunar-text-faint">{t.common.appSubtitle}</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${active === id ? "bg-lunar-surface-3 text-lunar-text-strong shadow-[inset_3px_0_0_var(--lunar-signal)]" : "text-lunar-text-muted hover:bg-lunar-surface-2 hover:text-lunar-text-strong"}`}>
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-lunar-border p-3 text-[10px] text-lunar-text-faint">
          <div>{t.sidebar.api}: <span className={apiConfigured ? "text-lunar-accent" : "text-lunar-signal"}>{apiConfigured ? t.sidebar.configured : t.sidebar.notConfigured}</span></div>
          <div className="break-all">{t.sidebar.base}: {apiBase}</div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-lunar-border bg-lunar-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-lunar-text-strong">{NAV.find((n) => n.id === active)?.label}</div>
              <div className="hidden text-xs text-lunar-text-muted sm:block">{t.header.subtitle}</div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-lunar-text-muted">
              <span className="hidden rounded-full border border-lunar-border-strong bg-lunar-surface-2 px-2.5 py-1 sm:inline-flex">{tr(t.header.sitesCount, { count: sites.length })}</span>
              <span className={`hidden rounded-full border px-2.5 py-1 md:inline-flex ${apiConfigured ? "border-lunar-border-strong bg-lunar-surface-2 text-lunar-accent" : "border-lunar-signal/40 bg-lunar-surface-2 text-lunar-signal"}`}>{apiConfigured ? t.common.dataBackendApi : t.common.apiNotConfiguredShort}</span>
              <LanguageSwitcher compact />
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-lunar-text-muted sm:hidden">
            <span>{tr(t.header.sitesCount, { count: sites.length })}</span>
            <span className={apiConfigured ? "text-lunar-accent" : "text-lunar-signal"}>{apiConfigured ? t.common.dataBackendApi : t.common.apiNotConfiguredShort}</span>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs ${active === id ? "bg-lunar-surface-3 text-lunar-text-strong" : "text-lunar-text-muted"}`}>{label}</button>
            ))}
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4">
          {active === "explorer" && (
            <>
              <div className="rounded-xl border border-lunar-border bg-lunar-surface-2 px-4 py-3 text-sm text-lunar-text">
                <span className="font-medium text-lunar-text-strong">{t.explorer.introLead}</span>{t.explorer.introText}
              </div>
              <div className="grid min-w-0 gap-4 xl:grid-cols-[1.7fr_1fr]">
                <div className="min-h-[480px] min-w-0 xl:min-h-[620px]">
                  <Globe />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <BackendStatusBadge />
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
              <InfoCard title={t.overview.objectiveTitle} text={t.overview.objectiveText} />
              <InfoCard title={t.overview.integrationTitle} text={t.overview.integrationText} />
              <InfoCard title={t.overview.experienceTitle} text={t.overview.experienceText} />
              <InfoCard title={t.overview.availabilityTitle} text={t.overview.availabilityText} />
            </section>
          )}

          {active === "comparison" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-lunar-border bg-lunar-surface-2 px-4 py-3 text-sm text-lunar-text-muted">{t.comparisonPage.intro}</div>
              <ComparisonPanel analysis={analysis} sites={sites} />
            </div>
          )}

          {active === "history" && (
            <section className="rounded-2xl border border-lunar-border bg-lunar-surface/80 p-4">
              <h2 className="mb-3 text-sm font-semibold text-lunar-text-strong">{t.history.title}</h2>
              {history.length === 0 ? (
                <div className="rounded-lg border border-dashed border-lunar-border-strong p-4 text-sm text-lunar-text-muted">{t.history.empty}</div>
              ) : (
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i} className="rounded-lg border border-lunar-border-strong bg-lunar-surface-2 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-lunar-text-strong">{new Date(h.at).toLocaleString()} · <span className="text-lunar-text-muted">{h.mode}</span></div>
                        <div className="font-mono text-xs text-lunar-text-muted">{h.start} → {h.end} · {h.step}h</div>
                      </div>
                      <div className="mt-1 text-xs text-lunar-text">{t.history.sites}: {h.sites.join(", ") || "—"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {active === "data" && (
            <section className="grid gap-4 md:grid-cols-2">
              <InfoCard title={t.data.visualTitle} text={t.data.visualText} />
              <InfoCard title={t.data.modelsTitle} text={t.data.modelsText} />
              <InfoCard title={t.data.contractTitle} text={t.data.contractText} />
              <InfoCard title={t.data.catalogTitle} text={t.data.catalogText} />
            </section>
          )}
        </main>

        <footer className="border-t border-lunar-border px-4 py-3 text-[11px] text-lunar-text-faint">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
            <span>{t.footer.app}</span>
            <span>{t.footer.dataId}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-lunar-border bg-lunar-surface/80 p-4">
      <h3 className="mb-1 text-sm font-semibold text-lunar-text-strong">{title}</h3>
      <p className="text-sm leading-relaxed text-lunar-text-muted">{text}</p>
    </article>
  );
}
