"use client";

import * as React from "react";
import { Check, Loader2, Minus, Pencil, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface InlineEditableStepperFieldProps {
  fieldId: string;
  activeFieldId: string | null;
  onActiveFieldIdChange: (fieldId: string | null) => void;
  value: number;
  min: number;
  max: number;
  onSave: (value: number) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
  editLabel: string;
  className?: string;
}

const viewBoxClass =
  "group/inline flex min-h-9 w-full items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm text-foreground transition-colors";
const viewBoxHoverClass =
  "hover:border-border/80 hover:bg-muted/25 focus-within:border-border/80 focus-within:bg-muted/25";
const actionButtonClass = "h-8 w-8 shrink-0 rounded-full";
const stepperButtonClass = "size-8 shrink-0";

export function InlineEditableStepperField({
  fieldId,
  activeFieldId,
  onActiveFieldIdChange,
  value,
  min,
  max,
  onSave,
  disabled = false,
  editLabel,
  className
}: InlineEditableStepperFieldProps) {
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = activeFieldId === fieldId;

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(value);
      setError(null);
    }
  }, [isEditing, value]);

  function startEditing() {
    if (disabled || saving) return;
    setDraft(value);
    setError(null);
    onActiveFieldIdChange(fieldId);
  }

  function cancelEditing() {
    setDraft(value);
    setError(null);
    onActiveFieldIdChange(null);
  }

  async function confirmEditing() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = await onSave(draft);
    setSaving(false);
    if (!res.ok) {
      setError(res.message ?? "Could not save.");
      return;
    }
    onActiveFieldIdChange(null);
  }

  if (disabled) {
    return <p className={cn("text-sm text-foreground tabular-nums", className)}>{value}</p>;
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center gap-1.5">
          <div className="border-input flex h-9 flex-1 items-center gap-2 rounded-md border px-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={stepperButtonClass}
              disabled={saving || draft <= min}
              aria-label={`Decrease ${editLabel}`}
              onClick={() => setDraft((current) => Math.max(min, current - 1))}>
              <Minus className="size-4" />
            </Button>
            <span className="min-w-8 flex-1 text-center text-sm font-medium tabular-nums">
              {draft}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={stepperButtonClass}
              disabled={saving || draft >= max}
              aria-label={`Increase ${editLabel}`}
              onClick={() => setDraft((current) => Math.min(max, current + 1))}>
              <Plus className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            size="icon"
            className={actionButtonClass}
            disabled={saving}
            aria-label={`Save ${editLabel}`}
            onClick={() => void confirmEditing()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(actionButtonClass, "border-border/80 bg-muted/40")}
            disabled={saving}
            aria-label={`Cancel editing ${editLabel}`}
            onClick={cancelEditing}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div
        role="button"
        tabIndex={0}
        className={cn(viewBoxClass, viewBoxHoverClass, "cursor-text")}
        onClick={startEditing}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEditing();
          }
        }}>
        <span className="min-w-0 flex-1 tabular-nums">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-within/inline:opacity-100"
          aria-label={`Edit ${editLabel}`}
          onClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}>
          <Pencil className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
