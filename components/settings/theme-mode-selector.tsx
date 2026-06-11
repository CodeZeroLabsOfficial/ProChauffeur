"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function ThemeModeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <p className="text-muted-foreground text-sm">Loading theme…</p>;
  }

  const value =
    theme === "light" || theme === "dark" ? theme : (resolvedTheme === "dark" ? "dark" : "light");

  return (
    <div className="space-y-2">
      <Label>Theme</Label>
      <p className="text-muted-foreground text-xs">Select the colour mode for your dashboard.</p>
      <RadioGroup
        value={value}
        onValueChange={setTheme}
        className="flex flex-wrap gap-4 pt-2 sm:gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="theme-light"
            className="[&:has([data-state=checked])>div]:border-primary flex cursor-pointer flex-col">
            <RadioGroupItem value="light" id="theme-light" className="sr-only" />
            <div className="hover:border-accent items-center rounded-lg border-2 p-1">
              <div className="space-y-2 rounded-lg bg-[#ecedef] p-2">
                <div className="space-y-2 rounded-md bg-white p-2 shadow-xs">
                  <div className="h-2 w-20 rounded-lg bg-[#ecedef]" />
                  <div className="h-2 w-24 rounded-lg bg-[#ecedef]" />
                </div>
                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs">
                  <div className="size-4 rounded-full bg-[#ecedef]" />
                  <div className="h-2 w-24 rounded-lg bg-[#ecedef]" />
                </div>
              </div>
            </div>
            <span className="block w-full p-2 text-center text-sm font-normal">Light</span>
          </Label>
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="theme-dark"
            className="[&:has([data-state=checked])>div]:border-primary flex cursor-pointer flex-col">
            <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
            <div className="hover:border-accent items-center rounded-lg border-2 p-1">
              <div className="space-y-2 rounded-lg bg-slate-950 p-2">
                <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-xs">
                  <div className="h-2 w-20 rounded-lg bg-slate-400" />
                  <div className="h-2 w-24 rounded-lg bg-slate-400" />
                </div>
                <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
                  <div className="size-4 rounded-full bg-slate-400" />
                  <div className="h-2 w-24 rounded-lg bg-slate-400" />
                </div>
              </div>
            </div>
            <span className="block w-full p-2 text-center text-sm font-normal">Dark</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
