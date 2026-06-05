"use client";

import * as React from "react";
import { format } from "date-fns";
import { Check, Loader2, Pencil, X } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface InlineEditableDateFieldProps {
  fieldId: string;
  activeFieldId: string | null;
  onActiveFieldIdChange: (fieldId: string | null) => void;
  value: Date | null | undefined;
  onSave: (value: Date | null) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
  editLabel: string;
  emptyDisplay?: string;
  className?: string;
}

const viewBoxClass =
  "group/inline flex min-h-9 w-full items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm text-foreground transition-colors";
const viewBoxHoverClass =
  "hover:border-border/80 hover:bg-muted/25 focus-within:border-border/80 focus-within:bg-muted/25";
const actionButtonClass = "h-8 w-8 shrink-0 rounded-full";

export function InlineEditableDateField({
  fieldId,
  activeFieldId,
  onActiveFieldIdChange,
  value,
  onSave,
  disabled = false,
  editLabel,
  emptyDisplay = "—",
  className
}: InlineEditableDateFieldProps) {
  const [draft, setDraft] = React.useState<Date | undefined>(value ?? undefined);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const isEditing = activeFieldId === fieldId;
  const displayText = value ? formatDate(value) : emptyDisplay;
  const isEmpty = !value;

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? undefined);
      setError(null);
      setCalendarOpen(false);
    }
  }, [isEditing, value]);

  function startEditing() {
    if (disabled || saving) return;
    setDraft(value ?? undefined);
    setError(null);
    onActiveFieldIdChange(fieldId);
    setCalendarOpen(true);
  }

  function cancelEditing() {
    setDraft(value ?? undefined);
    setError(null);
    setCalendarOpen(false);
    onActiveFieldIdChange(null);
  }

  async function confirmEditing(next: Date | null) {
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = await onSave(next);
    setSaving(false);
    if (!res.ok) {
      setError(res.message ?? "Could not save.");
      return;
    }
    setCalendarOpen(false);
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
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-9 flex-1 justify-start pl-3 text-left font-normal",
                  !draft && "text-muted-foreground"
                )}
                disabled={saving}
                aria-label={editLabel}>
                {draft ? format(draft, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                fromYear={1900}
                toYear={new Date().getFullYear()}
                selected={draft}
                onSelect={(d) => setDraft(d)}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                defaultMonth={draft}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            size="icon"
            className={actionButtonClass}
            disabled={saving}
            aria-label={`Save ${editLabel}`}
            onClick={() => void confirmEditing(draft ?? null)}>
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
        <span
          className={cn("min-w-0 flex-1 truncate", isEmpty && "text-muted-foreground")}>
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
