// LUNARIS — Slider controlado com legenda de valor (uniforme com o tema).
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  valueLabel?: string;
  className?: string;
  formatValue?: (v: number) => string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  showValue = true,
  valueLabel,
  className,
  formatValue,
}: SliderProps) {
  const percentage = (max - min) === 0 ? 0 : ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : String(value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        aria-label={valueLabel ?? "Amostras"}
        style={{ accentColor: "#E89A55" }}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-border"
      />
      {showValue && (
        <span className="flex w-20 shrink-0 items-center justify-center rounded-md bg-background/80 px-1.5 text-xs font-medium text-foreground ring-1 ring-inset ring-border">
          {valueLabel ? `${valueLabel}: ` : ""}
          {displayValue}
        </span>
      )}
    </div>
  );
}
