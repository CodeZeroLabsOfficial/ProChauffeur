"use client";

import { useEffect, useId, useState } from "react";
import { Loader2Icon, MapPinIcon } from "lucide-react";

import { useAddressSuggestions } from "@/hooks/use-address-suggestions";
import type { AddressSuggestion } from "@/lib/mapbox/geocoding";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

export type { AddressSuggestion };

export function AddressAutocomplete({
  id,
  value,
  onChange,
  placeholder = "Search for an address…",
  required,
  disabled,
  className
}: {
  id?: string;
  value: AddressSuggestion | null;
  onChange: (value: AddressSuggestion | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const listboxId = useId();
  const [query, setQuery] = useState(value?.addressLine ?? "");
  const [focused, setFocused] = useState(false);

  const selectionComplete = Boolean(value && query === value.addressLine);
  const { suggestions, loading, error } = useAddressSuggestions(
    query,
    focused && !disabled && !selectionComplete
  );

  useEffect(() => {
    setQuery(value?.addressLine ?? "");
  }, [value?.addressLine, value?.id]);

  const showList =
    focused &&
    !selectionComplete &&
    query.trim().length >= 2 &&
    (loading || error || suggestions.length > 0);

  function handleInputChange(next: string) {
    setQuery(next);
    if (value && next !== value.addressLine) {
      onChange(null);
    }
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    setQuery(suggestion.addressLine);
    onChange(suggestion);
    setFocused(false);
  }

  return (
    <Popover open={showList}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <Input
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="z-[100] w-(--radix-popover-anchor-width) p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false} className="rounded-md border-0 shadow-none">
          <CommandList id={listboxId}>
            {loading ? (
              <CommandEmpty className="flex items-center justify-center gap-2 py-6">
                <Loader2Icon className="size-4 animate-spin" />
                Searching…
              </CommandEmpty>
            ) : error ? (
              <CommandEmpty className="py-6">Address search is unavailable.</CommandEmpty>
            ) : suggestions.length === 0 ? (
              <CommandEmpty className="py-6">No addresses found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.id}
                    value={suggestion.id}
                    onSelect={() => selectSuggestion(suggestion)}
                    onMouseDown={(e) => e.preventDefault()}>
                    <MapPinIcon className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{suggestion.addressLine}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
