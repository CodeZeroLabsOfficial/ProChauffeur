"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_TIME = "09:00";

function toTimeString(date: Date) {
  return format(date, "HH:mm");
}

function mergeDateTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));
  const merged = startOfDay(day);
  merged.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  );
  return merged;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Pick date and time",
  disabled,
  invalid,
  className
}: {
  id?: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [calendarDay, setCalendarDay] = useState<Date | undefined>();
  const [time, setTime] = useState(DEFAULT_TIME);

  useEffect(() => {
    if (value) {
      setCalendarDay(startOfDay(value));
      setTime(toTimeString(value));
    } else {
      setCalendarDay(undefined);
      setTime(DEFAULT_TIME);
    }
  }, [value]);

  const minTime = useMemo(() => {
    if (!calendarDay) return undefined;
    const today = startOfDay(new Date());
    if (calendarDay.getTime() !== today.getTime()) return undefined;
    return toTimeString(new Date());
  }, [calendarDay]);

  function emit(day: Date | undefined, timeStr: string) {
    if (!day) {
      onChange(null);
      return;
    }
    onChange(mergeDateTime(day, timeStr));
  }

  function onDaySelect(day: Date | undefined) {
    setCalendarDay(day);
    emit(day, time);
  }

  function onTimeChange(timeStr: string) {
    setTime(timeStr);
    emit(calendarDay, timeStr);
  }

  function confirmSelection() {
    if (!calendarDay) return;
    setOpen(false);
  }

  function clear() {
    setCalendarDay(undefined);
    setTime(DEFAULT_TIME);
    onChange(null);
    setOpen(false);
  }

  const timeInputId = id ? `${id}-time` : undefined;

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full pl-3 text-left font-normal",
            !value && "text-muted-foreground",
            invalid &&
              "border-destructive ring-[3px] ring-destructive/20 dark:border-destructive dark:ring-destructive/40",
            className
          )}>
          {value ? format(value, "PPP p") : <span>{placeholder}</span>}
          <CalendarIcon className="ml-auto size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          fromYear={new Date().getFullYear()}
          toYear={new Date().getFullYear() + 5}
          selected={calendarDay}
          onSelect={onDaySelect}
          disabled={(date) => date < startOfDay(new Date())}
          defaultMonth={calendarDay ?? new Date()}
          initialFocus
        />
        <div className="space-y-2 border-t p-3">
          <Label htmlFor={timeInputId} className="text-muted-foreground text-xs">
            Time
          </Label>
          <Input
            id={timeInputId}
            type="time"
            value={time}
            min={minTime}
            disabled={!calendarDay}
            onChange={(e) => onTimeChange(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!calendarDay}
              onClick={confirmSelection}>
              Set
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={clear}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
