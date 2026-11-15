"use client";

import { Languages } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring"
      aria-label={t.language.select}
      title={t.language.label}
    >
      <Languages size={14} className="shrink-0 text-muted-foreground" aria-hidden />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-transparent pr-1 text-xs text-foreground outline-none cursor-pointer"
        aria-label={t.language.select}
      >
        {LOCALES.map((l) => (
          <option key={l.value} value={l.value} className="bg-popover text-popover-foreground">
            {compact ? l.short : `${l.label} (${l.short})`}
          </option>
        ))}
      </select>
    </label>
  );
}
