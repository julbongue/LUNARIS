"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Location, LocationInput } from "@/lib/models";
import { CATALOG_LOCATIONS, pickColor } from "@/lib/data-catalog";
import { createLocalLocation } from "@/services/api";

interface LocationsContextValue {
  sites: Location[];
  pendingPoint?: { lat: number; lon: number };
  setPendingPoint: (p: { lat: number; lon: number } | undefined) => void;
  addSite: (input: LocationInput) => Promise<void>;
  addOrSelectCatalogSite: (id: string) => void;
  toggleSite: (id: string) => void;
  updateSite: (id: string, input: LocationInput) => void;
  removeSite: (id: string) => void;
  clearSites: () => void;
  isMax: boolean;
}

const LocationsContext = createContext<LocationsContextValue | undefined>(undefined);
const STORAGE_KEY = "lunaris:sites:v1";

function loadSites(): Location[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Location[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.id === "string" && typeof s.latitude === "number" && typeof s.longitude === "number")
      .slice(0, 3);
  } catch {
    return [];
  }
}

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [sites, setSites] = useState<Location[]>(() => (typeof window === "undefined" ? [] : loadSites()));
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lon: number } | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    } catch {
      /* ignore */
    }
  }, [sites]);

  const addSite = useCallback(async (input: LocationInput) => {
    let created: Location | null = null;
    setSites((prev) => {
      if (prev.length >= 3) return prev;
      return prev;
    });
    created = await createLocalLocation(input);
    setSites((prev) => {
      if (prev.length >= 3 || !created) return prev;
      return [...prev, { ...created, color: created.color || pickColor(prev.length) }];
    });
  }, []);

  const addOrSelectCatalogSite = useCallback((id: string) => {
    setSites((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      if (prev.length >= 3) return prev;
      const cat = CATALOG_LOCATIONS.find((c) => c.id === id);
      if (!cat) return prev;
      return [...prev, { ...cat }];
    });
  }, []);

  const toggleSite = useCallback((id: string) => {
    addOrSelectCatalogSite(id);
  }, [addOrSelectCatalogSite]);

  const updateSite = useCallback((id: string, input: LocationInput) => {
    setSites((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const lat = Number(input.latitude);
        const lon = Number(input.longitude);
        const alt = input.altitudeM ? Number(input.altitudeM) : undefined;
        return {
          ...s,
          name: input.name.trim() || s.name,
          latitude: Number.isFinite(lat) ? lat : s.latitude,
          longitude: Number.isFinite(lon) ? lon : s.longitude,
          altitudeM: alt != null && Number.isFinite(alt) ? alt : undefined,
          coordinateSystem: input.coordinateSystem || s.coordinateSystem,
          color: input.color || s.color,
        };
      }),
    );
  }, []);

  const removeSite = useCallback((id: string) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSites = useCallback(() => setSites([]), []);

  const value = useMemo<LocationsContextValue>(() => ({
    sites,
    pendingPoint,
    setPendingPoint,
    addSite,
    addOrSelectCatalogSite,
    toggleSite,
    updateSite,
    removeSite,
    clearSites,
    isMax: sites.length >= 3,
  }), [sites, pendingPoint, addSite, addOrSelectCatalogSite, toggleSite, updateSite, removeSite, clearSites]);

  return <LocationsContext.Provider value={value}>{children}</LocationsContext.Provider>;
}

export function useLocations(): LocationsContextValue {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations deve ser usado dentro de LocationsProvider");
  return ctx;
}
