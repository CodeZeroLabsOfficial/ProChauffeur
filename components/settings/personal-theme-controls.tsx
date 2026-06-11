"use client";

import { BanIcon } from "lucide-react";

import { useThemeConfig } from "@/components/active-theme";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ColourPresetSelector() {
  const { theme, setTheme } = useThemeConfig();

  return (
    <div className="space-y-2">
      <Label htmlFor="theme-preset">Colour preset</Label>
      <p className="text-muted-foreground text-xs">Choose a palette for buttons, accents, and charts.</p>
      <Select
        value={theme.preset}
        onValueChange={(value) =>
          setTheme({ ...theme, ...DEFAULT_THEME, preset: value as typeof theme.preset })
        }>
        <SelectTrigger id="theme-preset" className="w-full">
          <SelectValue placeholder="Select a preset" />
        </SelectTrigger>
        <SelectContent>
          {THEMES.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 gap-1">
                  {preset.colors.map((color, index) => (
                    <span
                      key={index}
                      className="size-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {preset.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Not shown in settings UI; theme infra (cookies, CSS) remains active. */
function BorderRadiusSelector() {
  const { theme, setTheme } = useThemeConfig();

  return (
    <div className="space-y-2">
      <Label>Border radius</Label>
      <ToggleGroup
        className="w-full"
        value={theme.radius}
        type="single"
        onValueChange={(value) => value && setTheme({ ...theme, radius: value as typeof theme.radius })}>
        <ToggleGroupItem variant="outline" className="grow" value="default" aria-label="Default radius">
          <BanIcon className="size-4 opacity-50" />
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="sm">
          SM
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="md">
          MD
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="lg">
          LG
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="xl">
          XL
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/** Not shown in settings UI; theme infra (cookies, CSS) remains active. */
function UiScaleSelector() {
  const { theme, setTheme } = useThemeConfig();

  return (
    <div className="space-y-2">
      <Label>UI scale</Label>
      <ToggleGroup
        className="w-full"
        value={theme.scale}
        type="single"
        onValueChange={(value) => value && setTheme({ ...theme, scale: value as typeof theme.scale })}>
        <ToggleGroupItem variant="outline" className="grow" value="none" aria-label="Default scale">
          <BanIcon className="size-4 opacity-50" />
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="sm">
          Compact
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="lg">
          Large
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/** Not shown in settings UI; theme infra (cookies, CSS) remains active. */
function ContentLayoutSelector() {
  const { theme, setTheme } = useThemeConfig();

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Content layout</Label>
      <ToggleGroup
        className="w-full max-w-md"
        value={theme.contentLayout}
        type="single"
        onValueChange={(value) =>
          value && setTheme({ ...theme, contentLayout: value as typeof theme.contentLayout })
        }>
        <ToggleGroupItem variant="outline" className="grow" value="full">
          Full width
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="centered">
          Centered
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function PersonalThemeControls() {
  const showHiddenControls = false;

  if (!showHiddenControls) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <BorderRadiusSelector />
      <UiScaleSelector />
      <ContentLayoutSelector />
    </div>
  );
}
