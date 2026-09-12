"use client";

import { useId, useMemo, useState } from "react";
import { Loader2Icon, UserIcon, XIcon } from "lucide-react";

import { useUsers } from "@/hooks/use-collections";
import { customerDisplayName, customerMatchesQuery } from "@/lib/users/customer-display";
import type { User } from "@/lib/models/user";
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

const MAX_SUGGESTIONS = 50;

export function CustomerMultiAutocomplete({
  id,
  value,
  onChange,
  excludeIds,
  placeholder = "Search customers…",
  disabled,
  className
}: {
  id?: string;
  value: User[];
  onChange: (value: User[]) => void;
  /** Customer ids that cannot be selected (e.g. already members). */
  excludeIds?: Set<string> | string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const listboxId = useId();
  const { users, loading: usersLoading } = useUsers();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const excluded = useMemo(() => {
    const set = new Set(Array.isArray(excludeIds) ? excludeIds : [...(excludeIds ?? [])]);
    for (const selected of value) set.add(selected.id);
    return set;
  }, [excludeIds, value]);

  const customers = useMemo(
    () =>
      users
        .filter((u) => u.role === "customer")
        .filter((u) => !excluded.has(u.id))
        .filter((u) => customerMatchesQuery(u, query))
        .sort((a, b) => customerDisplayName(a).localeCompare(customerDisplayName(b)))
        .slice(0, MAX_SUGGESTIONS),
    [users, query, excluded]
  );

  const showList = focused && !disabled;

  function selectCustomer(customer: User) {
    onChange([...value, customer]);
    setQuery("");
    setFocused(true);
  }

  function removeCustomer(userId: string) {
    onChange(value.filter((u) => u.id !== userId));
  }

  return (
    <Popover open={showList}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
            disabled && "pointer-events-none opacity-50",
            className
          )}
          onClick={() => {
            if (!disabled) setFocused(true);
          }}>
          {value.map((customer) => (
            <span
              key={customer.id}
              className="bg-muted inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-sm">
              <span className="truncate">{customerDisplayName(customer)}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-sm"
                aria-label={`Remove ${customerDisplayName(customer)}`}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  removeCustomer(customer.id);
                }}>
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          <Input
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            placeholder={value.length === 0 ? placeholder : "Add another…"}
            disabled={disabled || usersLoading}
            className="h-7 min-w-[8rem] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && query === "" && value.length > 0) {
                removeCustomer(value[value.length - 1].id);
              }
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="z-[100] w-(--radix-popover-anchor-width) p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false} className="rounded-md border-0 shadow-none">
          <CommandList id={listboxId}>
            {usersLoading ? (
              <CommandEmpty className="flex items-center justify-center gap-2 py-6">
                <Loader2Icon className="size-4 animate-spin" />
                Loading customers…
              </CommandEmpty>
            ) : customers.length === 0 ? (
              <CommandEmpty className="py-6">
                {users.some((u) => u.role === "customer")
                  ? "No matching customers."
                  : "No customers in the directory."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => selectCustomer(customer)}
                    onMouseDown={(e) => e.preventDefault()}>
                    <UserIcon className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate">{customerDisplayName(customer)}</p>
                      {customer.profile.displayName?.trim() ? (
                        <p className="text-muted-foreground truncate text-xs">{customer.email}</p>
                      ) : null}
                    </div>
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
