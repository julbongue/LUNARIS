"use client";

import { useMemo, useState } from "react";
import { useLocations } from "./LocationsContext";
import { CATALOG_LOCATIONS } from "@/lib/data-catalog";
import { formatCoord } from "@/lib/coords";
import type { CoordinateSystem, Location } from "@/lib/models";

const SYSTEMS: { value: CoordinateSystem; label: string }[] = [
  { value: "meanEarth", label: "Mean Earth" },
  { value: "planetocentric", label: "Planetocentric" },
  { value: "planetographic", label: "Planetographic" },
];

export function LocationPanel() {
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
      name: fromPending && pendingPoint ? `Local ${pendingPoint.lat.toFixed(2)}, ${pendingPoint.lon.toFixed(2)}` : "",
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
    if (!form.name.trim()) return "Nome é obrigatório.";
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return "Latitude inválida (-90 a 90).";
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return "Longitude inválida (-180 a 180).";
    if (form.altitudeM && !Number.isFinite(Number(form.altitudeM))) return "Altitude inválida.";
    return null;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    if (editingId) {
      updateSite(editingId, form);
    } else {
      if (isMax) { setError("Máximo de 3 locais atingido."); return; }
      await addSite(form);
      setPendingPoint(undefined);
    }
    cancel();
  };

  const inputCls = "w-full rounded-lg border border-[#2a3a4a] bg-[#0a1018] px-2.5 py-1.5 text-sm text-[#F1F0EB] placeholder:text-[#6b7a8a] focus:border-[#8FAFC7] focus:outline-none";

  return (
    <section className="rounded-2xl border border-[#1e2a37] bg-[#101820]/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#F1F0EB]">Locais selecionados</h2>
          <p className="text-xs text-[#8FAFC7]">Até 3 locais · {sites.length}/3</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-[#2a3a4a] px-2.5 py-1 text-xs text-[#D5D2C9] hover:bg-[#172B40] disabled:opacity-40" onClick={() => startAdd(false)} disabled={isMax || adding || !!editingId}>Adicionar</button>
          <button className="rounded-md border border-[#2a3a4a] px-2.5 py-1 text-xs text-[#D5D2C9] hover:bg-[#172B40] disabled:opacity-40" onClick={clearSites} disabled={sites.length === 0}>Limpar</button>
        </div>
      </div>

      {pendingPoint && !isMax && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-[#2a3a4a] bg-[#0d1824] px-3 py-2 text-xs">
          <span className="text-[#D5D2C9]">Ponto selecionado no globo: <span className="font-mono text-[#8FAFC7]">{formatCoord(pendingPoint.lat, pendingPoint.lon)}</span></span>
          <button className="rounded border border-[#2a3a4a] px-2 py-0.5 text-[#F1F0EB] hover:bg-[#172B40]" onClick={() => startAdd(true)}>Usar ponto</button>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2a3a4a] p-4 text-center text-sm text-[#8FAFC7]">
          Nenhum local selecionado. Clique no globo, escolha do catálogo ou adicione manualmente.
        </div>
      ) : (
        <ul className="space-y-2">
          {sites.map((site) => (
            <li key={site.id} className="rounded-lg border border-[#2a3a4a] bg-[#0d1824] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: site.color }} />
                    <span className="truncate text-sm font-medium text-[#F1F0EB]">{site.name}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#8FAFC7]">{formatCoord(site.latitude, site.longitude)}</div>
                  <div className="mt-0.5 text-[11px] text-[#6b7a8a]">
                    {site.coordinateSystem}{site.altitudeM != null ? ` · ${site.altitudeM} m` : " · altitude: N/D"}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="rounded border border-[#2a3a4a] px-2 py-1 text-[11px] text-[#D5D2C9] hover:bg-[#172B40]" onClick={() => startEdit(site)}>Editar</button>
                  <button className="rounded border border-[#2a3a4a] px-2 py-1 text-[11px] text-[#D5D2C9] hover:bg-[#172B40]" onClick={() => removeSite(site.id)}>Remover</button>
                </div>
              </div>
              {editingId === site.id && (
                <form className="mt-3 grid gap-2 border-t border-[#2a3a4a] pt-3" onSubmit={save}>
                  <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Latitude" />
                    <input className={inputCls} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Longitude" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={form.altitudeM} onChange={(e) => setForm({ ...form, altitudeM: e.target.value })} placeholder="Altitude (m)" />
                    <select className={inputCls} value={form.coordinateSystem} onChange={(e) => setForm({ ...form, coordinateSystem: e.target.value as CoordinateSystem })}>
                      {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#8FAFC7]">Cor</label>
                    <select className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                      <option value="#E89A55">Signal Orange</option>
                      <option value="#8FAFC7">Lunar Blue</option>
                      <option value="#D5D2C9">Moon Dust</option>
                      <option value="#85847F">Regolith Grey</option>
                      <option value="#F1F0EB">Lunar White</option>
                    </select>
                  </div>
                  {error && <div className="text-xs text-[#E89A55]">{error}</div>}
                  <div className="flex gap-2"><button type="submit" className="rounded bg-[#172B40] px-3 py-1.5 text-xs text-[#F1F0EB]">Guardar</button><button type="button" onClick={cancel} className="rounded border border-[#2a3a4a] px-3 py-1.5 text-xs text-[#D5D2C9]">Cancelar</button></div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {(adding) && (
        <form className="mt-3 grid gap-2 rounded-lg border border-[#2a3a4a] bg-[#0d1824] p-3" onSubmit={save}>
          <div className="text-xs font-medium text-[#8FAFC7]">Novo local</div>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Latitude" />
            <input className={inputCls} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Longitude" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} value={form.altitudeM} onChange={(e) => setForm({ ...form, altitudeM: e.target.value })} placeholder="Altitude (m, opcional)" />
            <select className={inputCls} value={form.coordinateSystem} onChange={(e) => setForm({ ...form, coordinateSystem: e.target.value as CoordinateSystem })}>
              {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8FAFC7]">Cor</label>
            <select className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
              <option value="#E89A55">Signal Orange</option>
              <option value="#8FAFC7">Lunar Blue</option>
              <option value="#D5D2C9">Moon Dust</option>
              <option value="#85847F">Regolith Grey</option>
              <option value="#F1F0EB">Lunar White</option>
            </select>
          </div>
          {error && <div className="text-xs text-[#E89A55]">{error}</div>}
          <div className="flex gap-2"><button type="submit" className="rounded bg-[#172B40] px-3 py-1.5 text-xs text-[#F1F0EB]">Guardar</button><button type="button" onClick={cancel} className="rounded border border-[#2a3a4a] px-3 py-1.5 text-xs text-[#D5D2C9]">Cancelar</button></div>
        </form>
      )}

      {!isMax && availableCatalog.length > 0 && !adding && !editingId && (
        <div className="mt-4 border-t border-[#2a3a4a] pt-3">
          <div className="mb-2 text-xs font-medium text-[#8FAFC7]">Locais de referência (catálogo)</div>
          <div className="flex flex-wrap gap-2">
            {availableCatalog.map((c) => (
              <button key={c.id} className="rounded-full border border-[#2a3a4a] px-2.5 py-1 text-[11px] text-[#D5D2C9] hover:bg-[#172B40]" onClick={() => addOrSelectCatalogSite(c.id)}>
                <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c.color }} />{c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
