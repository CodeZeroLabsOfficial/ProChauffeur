"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { fetchOperatingHours, saveOperatingHours } from "@/lib/services/firebase-service";
import type { FleetWeeklyOperatingSchedule } from "@/lib/models";
import { appConfig } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Display order Monday→Sunday using Calendar weekday numbers (1=Sun … 7=Sat).
const WEEKDAYS: { num: number; label: string }[] = [
  { num: 2, label: "Mon" },
  { num: 3, label: "Tue" },
  { num: 4, label: "Wed" },
  { num: 5, label: "Thu" },
  { num: 6, label: "Fri" },
  { num: 7, label: "Sat" },
  { num: 1, label: "Sun" }
];

function newSchedule(): FleetWeeklyOperatingSchedule {
  return {
    id: crypto.randomUUID(),
    isEnabled: true,
    weekdayNumbers: [2, 3, 4, 5, 6],
    startTime: "08:00",
    endTime: "18:00"
  };
}

export default function OperatingHoursPage() {
  const [timezone, setTimezone] = useState(appConfig.timezone);
  const [schedules, setSchedules] = useState<FleetWeeklyOperatingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOperatingHours()
      .then((h) => {
        setTimezone(h.timeZoneIdentifier || appConfig.timezone);
        setSchedules(h.schedules.length ? h.schedules : [newSchedule()]);
      })
      .catch(() => setSchedules([newSchedule()]))
      .finally(() => setLoading(false));
  }, []);

  function patch(id: string, p: Partial<FleetWeeklyOperatingSchedule>) {
    setSchedules((rows) => rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function toggleDay(id: string, day: number) {
    setSchedules((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const has = r.weekdayNumbers.includes(day);
        return {
          ...r,
          weekdayNumbers: has
            ? r.weekdayNumbers.filter((d) => d !== day)
            : [...r.weekdayNumbers, day]
        };
      })
    );
  }

  async function save() {
    setSaving(true);
    try {
      await saveOperatingHours({ timeZoneIdentifier: timezone, schedules });
      toast.success("Operating hours saved.");
    } catch {
      toast.error("Could not save operating hours.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Time zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="tz">IANA time zone</Label>
            <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Australia/Sydney" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weekly schedules</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setSchedules((r) => [...r, newSchedule()])}>
            <PlusIcon /> Add schedule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.map((s) => (
            <div key={s.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={s.isEnabled} onCheckedChange={(v) => patch(s.id, { isEnabled: v })} />
                  <span className="text-sm font-medium">{s.isEnabled ? "Active" : "Disabled"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSchedules((r) => r.filter((x) => x.id !== s.id))}>
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(s.id, d.num)}
                    className={cn(
                      "h-8 w-11 rounded-md border text-sm transition-colors",
                      s.weekdayNumbers.includes(d.num)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    value={s.startTime ?? ""}
                    onChange={(e) => patch(s.id, { startTime: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    value={s.endTime ?? ""}
                    onChange={(e) => patch(s.id, { endTime: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save operating hours"}
        </Button>
      </div>
    </div>
  );
}
