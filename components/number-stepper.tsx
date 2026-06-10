"use client";

import { useEffect, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function snapToStep(value: number, step: number, min: number, max: number) {
  const snapped = Math.round(value / step) * step;
  const precision = Math.max(0, -Math.floor(Math.log10(step)));
  const rounded = Number(snapped.toFixed(precision));
  return Math.min(max, Math.max(min, rounded));
}

function formatDisplay(value: number, decimals?: number) {
  return decimals != null ? value.toFixed(decimals) : String(value);
}

export function NumberStepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  decimals,
  disabled
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const atMin = value <= min;
  const atMax = value >= max;

  useEffect(() => {
    if (!editing) {
      setText(formatDisplay(value, decimals));
    }
  }, [editing, value, decimals]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const parsed = parseFloat(text);
    if (!Number.isFinite(parsed)) {
      setText(formatDisplay(value, decimals));
      setEditing(false);
      return;
    }
    onChange(snapToStep(parsed, step, min, max));
    setEditing(false);
  }

  function startEditing() {
    if (disabled) return;
    setText(formatDisplay(value, decimals));
    setEditing(true);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "border-input bg-background flex h-9 items-center justify-between rounded-md border shadow-xs",
          disabled && "pointer-events-none opacity-50"
        )}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-l-md rounded-r-none"
          aria-label={`Decrease ${label}`}
          disabled={disabled || editing || atMin}
          onClick={() => onChange(snapToStep(value - step, step, min, max))}>
          <MinusIcon />
        </Button>
        {editing ? (
          <input
            ref={inputRef}
            id={id}
            type="number"
            step={step}
            min={min}
            max={max}
            value={text}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                setText(formatDisplay(value, decimals));
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            id={id}
            className="min-w-8 flex-1 cursor-text text-center text-sm font-medium tabular-nums"
            aria-live="polite"
            aria-atomic="true"
            onClick={startEditing}>
            {formatDisplay(value, decimals)}
          </button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-l-none rounded-r-md"
          aria-label={`Increase ${label}`}
          disabled={disabled || editing || atMax}
          onClick={() => onChange(snapToStep(value + step, step, min, max))}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
