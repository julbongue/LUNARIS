"use client";

import { useMemo, useState } from "react";
import { useLocations } from "./LocationsContext";
import { CATALOG_LOCATIONS } from "@/lib/data-catalog";
import { formatCoord } from "@/lib/coords";
import { useI18n } from "@/lib/i18n/provider";
import type { CoordinateSystem, Location } from "@/lib/models";

const SYSTEMS: { value: CoordinateSystem; label: string }[] = [
  { value: "meanEarth", label: "Mean Earth" },
  { value: "planetocentric", label: "Planetocentric" },
  { value: "planetographic", label: "Planetographic" },
];

export function LocationPanel() {
  const { t, tr } = useI18n();
  const { sites, addSite, addOrSelectCatalogSite, updateSite, removeSite, clearSites, isMax, pendingPoint, setPendingPoint } = useLocations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", latitude: "", longitude: "", altitudeM: "", color: "#E89A55", coordinateSystem: "meanEarth" as CoordinateSystem });
  const [error, setError] = useState<string | null>(null);

  const availableCatalog = useMemo(() => CATALOG_LOCATIONS.filter((c) => !sites.some((s) => s.id === c.id)), [sites]);

  const startAdd = (fromPending = false) => {
    setAdding(true);
    setEditingId(null);
    setError(null);
    setForm({
      name: fromPending && pendingPoint ? tr(t.globe.customSiteName, { lat: pendingPoint.lat.toFixed(2), lon: pendingPoint.lon.toFixed(2) }) : "",
      latitude: fromPending && pendingPoint ? pendingPoint.lat.toFixed(4) : "",
      longitude: fromPending && pendingPoint ? pendingPoint.lon.toFixed(4) : "",
      altitudeM: "",
      color: ["#E89A55", "#8FAFC7", "#D5D2C9"][sites.length] || "#E89A55",
      coordinateSystem: "meanEarth",
    });
  };

  const startEdit = (site: Location) => {
    setEditingId(site.id);
    setAdding(false);
    setError(null);
    setForm({
      name: site.name,
      latitude: String(site.latitude),
      longitude: String(site.longitude),
      altitudeM: site.altitudeM != null ? String(site.altitudeM) : "",
      color: site.color,
      coordinateSystem: site.coordinateSystem,
    });
  };

  const cancel = () => { setAdding(false); setEditingId(null); setError(null); };

  const validate = () => {
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    if (!form.name.trim()) return t.locations.errors.nameRequired;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return t.locations.errors.latitudeInvalid;
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return t.locations.errors.longitudeInvalid;
    if (form.altitudeM && !Number.isFinite(Number(form.altitudeM))) return t.locations.errors.altitudeInvalid;
    return null;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    if (editingId) {
      updateSite(editingId, form);
    } else {
      if (isMax) { setError(t.locations.errors.maxReached); return; }
      await addSite(form);
      setPendingPoint(undefined);
    }
    cancel();
  };

  const inputCls = "w-full rounded-lg border border-lunar-border-strong bg-lunar-bg px-2.5 py-1.5 text-sm text-lunar-text-strong placeholder:text-lunar-text-faint focus:border-lunar-accent focus:outline-none focus:ring-1 focus:ring-ring";

  const colorOptions = [
    { value: "#E89A55", label: t.colors.signalOrange },
    { value: "#8FAFC7", label: t.colors.lunarBlue },
    { value: "#D5D2C9", label: t.colors.moonDust },
    { value: "#85847F", label: t.colors.regolithGrey },
    { value: "#F1F0EB", label: t.colors.lunarWhite },
  ];

  return (
    <section className="rounded-2xl border border-lunar-border bg-lunar-surface/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-lunar-text-strong">{t.locations.selectedTitle}</h2>
          <p className="text-xs text-lunar-text-muted">{tr(t.locations.selectedSubtitle, { count: sites.length })}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-lunar-border-strong px-2.5 py-1 text-xs text-lunar-text hover:bg-lunar-surface-3 disabled:opacity-40" onClick={() => startAdd(false)} disabled={isMax || adding || !!editingId}>{t.common.add}</button>
          <button className="rounded-md border border-lunar-border-strong px-2.5 py-1 text-xs text-lunar-text hover:bg-lunar-surface-3 disabled:opacity-40" onClick={clearSites} disabled={sites.length === 0}>{t.common.clear}</button>
        </div>
      </div>

      {pendingPoint && !isMax && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-lunar-border-strong bg-lunar-surface-2 px-3 py-2 text-xs">
          <span className="text-lunar-text">{t.locations.pendingPoint} <span className="font-mono text-lunar-accent">{formatCoord(pendingPoint.lat, pendingPoint.lon)}</span></span>
          <button className="rounded border border-lunar-border-strong px-2 py-0.5 text-lunar-text-strong hover:bg-lunar-surface-3" onClick={() => startAdd(true)}>{t.common.usePoint}</button>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-lunar-border-strong p-4 text-center text-sm text-lunar-text-muted">
          {t.locations.empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {sites.map((site) => (
            <li key={site.id} className="rounded-lg border border-lunar-border-strong bg-lunar-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: site.color }} />
                    <span className="truncate text-sm font-medium text-lunar-text-strong">{site.name}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-lunar-accent">{formatCoord(site.latitude, site.longitude)}</div>
                  <div className="mt-0.5 text-[11px] text-lunar-text-faint">
                    {site.coordinateSystem}{site.altitudeM != null ? ` · ${site.altitudeM} m` : ` · ${t.locations.altitudeNd}`}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="rounded border border-lunar-border-strong px-2 py-1 text-[11px] text-lunar-text hover:bg-lunar-surface-3" onClick={() => startEdit(site)}>{t.common.edit}</button>
                  <button className="rounded border border-lunar-border-strong px-2 py-1 text-[11px] text-lunar-text hover:bg-lunar-surface-3" onClick={() => removeSite(site.id)}>{t.common.remove}</button>
                </div>
              </div>
              {editingId === site.id && (
                <form className="mt-3 grid gap-2 border-t border-lunar-border-strong pt-3" onSubmit={save}>
                  <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.locations.namePlaceholder} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder={t.locations.latitudePlaceholder} />
                    <input className={inputCls} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder={t.locations.longitudePlaceholder} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={form.altitudeM} onChange={(e) => setForm({ ...form, altitudeM: e.target.value })} placeholder={t.locations.altitudePlaceholder} />
                    <select className={inputCls} value={form.coordinateSystem} onChange={(e) => setForm({ ...form, coordinateSystem: e.target.value as CoordinateSystem })}>
                      {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-lunar-text-muted">{t.locations.color}</label>
                    <select className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                      {colorOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {error && <div className="text-xs text-lunar-signal">{error}</div>}
                  <div className="flex gap-2"><button type="submit" className="rounded bg-lunar-surface-3 px-3 py-1.5 text-xs text-lunar-text-strong hover:opacity-90">{t.common.save}</button><button type="button" onClick={cancel} className="rounded border border-lunar-border-strong px-3 py-1.5 text-xs text-lunar-text">{t.common.cancel}</button></div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form className="mt-3 grid gap-2 rounded-lg border border-lunar-border-strong bg-lunar-surface-2 p-3" onSubmit={save}>
          <div className="text-xs font-medium text-lunar-text-muted">{t.locations.newSite}</div>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.locations.namePlaceholder} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder={t.locations.latitudePlaceholder} />
            <input className={inputCls} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder={t.locations.longitudePlaceholder} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} value={form.altitudeM} onChange={(e) => setForm({ ...form, altitudeM: e.target.value })} placeholder={t.locations.altitudeOptionalPlaceholder} />
            <select className={inputCls} value={form.coordinateSystem} onChange={(e) => setForm({ ...form, coordinateSystem: e.target.value as CoordinateSystem })}>
              {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-lunar-text-muted">{t.locations.color}</label>
            <select className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
              {colorOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {error && <div className="text-xs text-lunar-signal">{error}</div>}
          <div className="flex gap-2"><button type="submit" className="rounded bg-lunar-surface-3 px-3 py-1.5 text-xs text-lunar-text-strong hover:opacity-90">{t.common.save}</button><button type="button" onClick={cancel} className="rounded border border-lunar-border-strong px-3 py-1.5 text-xs text-lunar-text">{t.common.cancel}</button></div>
        </form>
      )}

      {!isMax && availableCatalog.length > 0 && !adding && !editingId && (
        <div className="mt-4 border-t border-lunar-border-strong pt-3">
          <div className="mb-2 text-xs font-medium text-lunar-text-muted">{t.locations.catalogTitle}</div>
          <div className="flex flex-wrap gap-2">
            {availableCatalog.map((c) => (
              <button key={c.id} className="rounded-full border border-lunar-border-strong px-2.5 py-1 text-[11px] text-lunar-text hover:bg-lunar-surface-3" onClick={() => addOrSelectCatalogSite(c.id)}>
                <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c.color }} />{c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
