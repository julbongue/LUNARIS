"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Location, LocationInput } from "@/lib/models";
import { CATALOG_LOCATIONS, pickColor } from "@/lib/data-catalog";
import { createLocalLocation } from "@/services/api";
import { useI18n } from "@/lib/i18n/provider";

const MAX_SITES = 3;

interface LocationsContextValue {
  sites: Location[];
  addSite: (input: LocationInput) => Promise<Location | null>;
  addOrSelectCatalogSite: (id: string) => void;
  updateSite: (id: string, input: LocationInput) => void;
  removeSite: (id: string) => void;
  clearSites: () => void;
  isMax: boolean;
  pendingPoint?: { lat: number; lon: number };
  setPendingPoint: (p?: { lat: number; lon: number }) => void;
}

const LocationsContext = createContext<LocationsContextValue | null>(null);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [sites, setSites] = useState<Location[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lon: number } | undefined>();

  const addSite = useCallback(async (input: LocationInput): Promise<Location | null> => {
    let created: Location | null = null;
    setSites((prev) => {
      if (prev.length >= MAX_SITES) return prev;
      return prev;
    });
    if (sites.length >= MAX_SITES) return null;
    const withColor = { ...input, color: input.color || pickColor(sites.length) };
    created = await createLocalLocation(withColor, { locations: t.locations, apiErrors: t.apiErrors });
    setSites((prev) => (prev.length >= MAX_SITES ? prev : [...prev, created!]));
    return created;
  }, [sites.length, t]);

  const addOrSelectCatalogSite = useCallback((id: string) => {
    setSites((prev) => {
      if (prev.find((s) => s.id === id)) return prev;
      if (prev.length >= MAX_SITES) return prev;
      const catalog = CATALOG_LOCATIONS.find((l) => l.id === id);
      if (!catalog) return prev;
      const color = pickColor(prev.length);
      return [...prev, { ...catalog, color }];
    });
  }, []);

  const updateSite = useCallback((id: string, input: LocationInput) => {
    setSites((prev) => prev.map((s) => s.id === id ? {
      ...s,
      name: input.name || s.name,
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
      altitudeM: input.altitudeM ? Number(input.altitudeM) : undefined,
      coordinateSystem: input.coordinateSystem,
      color: input.color || s.color,
    } : s));
  }, []);

  const removeSite = useCallback((id: string) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSites = useCallback(() => setSites([]), []);

  return (
    <LocationsContext.Provider value={{
      sites,
      addSite,
      addOrSelectCatalogSite,
      updateSite,
      removeSite,
      clearSites,
      isMax: sites.length >= MAX_SITES,
      pendingPoint,
      setPendingPoint,
    }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations(): LocationsContextValue {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations must be used within LocationsProvider");
  return ctx;
}
