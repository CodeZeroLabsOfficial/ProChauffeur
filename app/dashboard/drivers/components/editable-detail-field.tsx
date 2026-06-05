"use client";

import { PencilIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TextEditableDetailFieldProps = {
  label: string;
  type?: "text" | "email" | "tel";
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
};

type DateEditableDetailFieldProps = {
  label: string;
  type: "date";
  value: Date | null | undefined;
  placeholder?: string;
  onSave: (value: Date | null) => Promise<void>;
  disabled?: boolean;
};

export type EditableDetailFieldProps = TextEditableDetailFieldProps | DateEditableDetailFieldProps;

function FieldChrome({
  label,
  children,
  onEditClick,
  disabled
}: {
  label: string;
  children: React.ReactNode;
  onEditClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="group relative">
      <span className="text-muted-foreground mb-1 block text-xs font-medium tracking-wide uppercase opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
      <div
        className={cn(
          "border-input flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
          !disabled && "group-hover:border-ring group-focus-within:border-ring"
        )}>
        <div className="min-w-0 flex-1">{children}</div>
        {!disabled && onEditClick ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`Edit ${label}`}
            onClick={onEditClick}>
            <PencilIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TextEditableDetailField({
  label,
  type = "text",
  value,
  placeholder,
  onSave,
  disabled
}: TextEditableDetailFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const trimmed = value.trim();
  const isEmpty = !trimmed;
  const display = isEmpty ? placeholder ?? "—" : trimmed;

  async function commit(next: string) {
    if (saving) return;
    const nextTrimmed = next.trim();
    if (nextTrimmed === trimmed) {
      setEditing(false);
      return;
    }
    if (type === "email" && nextTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextTrimmed)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      await onSave(nextTrimmed);
      setEditing(false);
      toast.success(`${label} saved.`);
    } catch {
      toast.error(`Could not save ${label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (disabled) {
    return (
      <FieldChrome label={label} disabled>
        <span
          className={cn("block truncate text-sm", isEmpty && "text-muted-foreground")}>
          {display}
        </span>
      </FieldChrome>
    );
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
        <Input
          ref={inputRef}
          type={type === "email" ? "email" : type === "tel" ? "tel" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit(draft);
            if (e.key === "Escape") cancel();
          }}
          disabled={saving}
          placeholder={placeholder}
          className="h-9"
        />
      </div>
    );
  }

  const readContent =
    type === "email" && !isEmpty ? (
      <a href={`mailto:${trimmed}`} className="block truncate text-sm hover:underline">
        {trimmed}
      </a>
    ) : type === "tel" && !isEmpty ? (
      <a href={`tel:${trimmed}`} className="block truncate text-sm hover:underline">
        {trimmed}
      </a>
    ) : (
      <span className={cn("block truncate text-sm", isEmpty && "text-muted-foreground")}>
        {display}
      </span>
    );

  return (
    <FieldChrome label={label} onEditClick={() => setEditing(true)}>
      {readContent}
    </FieldChrome>
  );
}

function DateEditableDetailField({
  label,
  value,
  placeholder = "Pick a date",
  onSave,
  disabled
}: DateEditableDetailFieldProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const display = value ? formatDate(value) : placeholder;
  const isEmpty = !value;

  async function commit(next: Date | undefined) {
    if (saving) return;
    const nextValue = next ?? null;
    const same =
      (value?.toDateString() ?? "") === (nextValue?.toDateString() ?? "");
    if (same) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextValue);
      setOpen(false);
      toast.success(`${label} saved.`);
    } catch {
      toast.error(`Could not save ${label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  if (disabled) {
    return (
      <FieldChrome label={label} disabled>
        <span className={cn("block truncate text-sm", isEmpty && "text-muted-foreground")}>
          {isEmpty ? "—" : display}
        </span>
      </FieldChrome>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="group relative">
        <span className="text-muted-foreground mb-1 block text-xs font-medium tracking-wide uppercase opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {label}
        </span>
        <div className="border-input group-hover:border-ring group-focus-within:border-ring flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 transition-colors">
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "min-w-0 flex-1 truncate text-start text-sm",
                isEmpty && "text-muted-foreground"
              )}
              aria-label={`Edit ${label}`}>
              {isEmpty ? "—" : display}
            </button>
          </PopoverTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`Edit ${label}`}
            onClick={() => setOpen(true)}>
            <PencilIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          fromYear={1900}
          toYear={new Date().getFullYear()}
          selected={value ?? undefined}
          onSelect={(d) => void commit(d)}
          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
          defaultMonth={value ?? undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function EditableDetailField(props: EditableDetailFieldProps) {
  if (props.type === "date") {
    return <DateEditableDetailField {...props} />;
  }
  return <TextEditableDetailField {...props} />;
}
