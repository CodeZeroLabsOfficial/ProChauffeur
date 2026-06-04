"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Loader2Icon, UserIcon } from "lucide-react";

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

export function CustomerAutocomplete({
  id,
  value,
  onChange,
  placeholder = "Search customers…",
  required,
  disabled,
  className
}: {
  id?: string;
  value: User | null;
  onChange: (value: User | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const listboxId = useId();
  const { users, loading: usersLoading } = useUsers();
  const [query, setQuery] = useState(value ? customerDisplayName(value) : "");
  const [focused, setFocused] = useState(false);

  const customers = useMemo(
    () =>
      users
        .filter((u) => u.role === "customer")
        .filter((u) => customerMatchesQuery(u, query))
        .sort((a, b) => customerDisplayName(a).localeCompare(customerDisplayName(b)))
        .slice(0, MAX_SUGGESTIONS),
    [users, query]
  );

  const selectionComplete = Boolean(value && query === customerDisplayName(value));

  useEffect(() => {
    setQuery(value ? customerDisplayName(value) : "");
  }, [value]);

  const showList = focused && !selectionComplete && !disabled;

  function handleInputChange(next: string) {
    setQuery(next);
    if (value && next !== customerDisplayName(value)) {
      onChange(null);
    }
  }

  function selectCustomer(customer: User) {
    setQuery(customerDisplayName(customer));
    onChange(customer);
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
            disabled={disabled || usersLoading}
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
