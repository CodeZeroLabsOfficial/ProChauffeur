"use client";

import * as React from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";

import { vehicleMakeSelectValue } from "@/lib/vehicle-makes";
import { cn } from "@/lib/utils";
import { VehicleMakeSelect } from "@/components/vehicle-make-select";
import { Button } from "@/components/ui/button";

export interface InlineEditableVehicleMakeFieldProps {
  fieldId: string;
  activeFieldId: string | null;
  onActiveFieldIdChange: (fieldId: string | null) => void;
  value: string;
  onSave: (make: string) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
  editLabel?: string;
  emptyDisplay?: string;
  nested?: boolean;
  className?: string;
}

const viewBoxClass =
  "group/inline flex min-h-9 w-full items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm text-foreground transition-colors";
const viewBoxHoverClass =
  "hover:border-border/80 hover:bg-muted/25 focus-within:border-border/80 focus-within:bg-muted/25";
const actionButtonClass = "h-8 w-8 shrink-0 rounded-full";

export function InlineEditableVehicleMakeField({
  fieldId,
  activeFieldId,
  onActiveFieldIdChange,
  value,
  onSave,
  disabled = false,
  editLabel = "make",
  emptyDisplay = "—",
  nested = false,
  className
}: InlineEditableVehicleMakeFieldProps) {
  const displayValue = vehicleMakeSelectValue(value);
  const [draft, setDraft] = React.useState(displayValue);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = activeFieldId === fieldId;
  const isEmpty = !displayValue.trim();
  const displayText = isEmpty ? emptyDisplay : displayValue;

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(displayValue);
      setError(null);
    }
  }, [displayValue, isEditing]);

  function startEditing() {
    if (disabled || saving) return;
    setDraft(displayValue);
    setError(null);
    onActiveFieldIdChange(fieldId);
  }

  function cancelEditing() {
    setDraft(displayValue);
    setError(null);
    onActiveFieldIdChange(null);
  }

  async function confirmEditing() {
    if (saving) return;
    if (!draft.trim()) {
      setError("Select a vehicle make.");
      return;
    }
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
    return (
      <p className={cn("text-sm text-foreground", isEmpty && "text-muted-foreground", className)}>
        {displayText}
      </p>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <VehicleMakeSelect
              value={draft || null}
              nested={nested}
              disabled={saving}
              onChange={setDraft}
            />
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
        <span className={cn("min-w-0 flex-1 truncate", isEmpty && "text-muted-foreground")}>
          {displayText}
        </span>
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
