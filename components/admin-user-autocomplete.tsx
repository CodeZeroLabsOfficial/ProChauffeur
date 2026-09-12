"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

const MAX_SUGGESTIONS = 50;

export function AdminUserAutocomplete({
  id,
  value,
  onChange,
  placeholder = "Search team admins…",
  disabled,
  invalid,
  className,
  allowClear = true
}: {
  id?: string;
  value: User | null;
  onChange: (value: User | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  allowClear?: boolean;
}) {
  const listboxId = useId();
  const { users, loading: usersLoading } = useUsers();
  const [query, setQuery] = useState(value ? customerDisplayName(value) : "");
  const [focused, setFocused] = useState(false);

  const admins = useMemo(
    () =>
      users
        .filter((u) => u.role === "admin")
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

  function selectAdmin(admin: User) {
    setQuery(customerDisplayName(admin));
    onChange(admin);
    setFocused(false);
  }

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <Popover open={showList}>
        <PopoverAnchor asChild>
          <div className="relative min-w-0 flex-1">
            <Input
              id={id}
              role="combobox"
              aria-expanded={showList}
              aria-controls={listboxId}
              aria-autocomplete="list"
              autoComplete="off"
              value={query}
              placeholder={placeholder}
              aria-invalid={invalid || undefined}
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
                  Loading admins…
                </CommandEmpty>
              ) : admins.length === 0 ? (
                <CommandEmpty className="py-6">
                  {users.some((u) => u.role === "admin")
                    ? "No matching admins."
                    : "No admins in the directory."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {admins.map((admin) => (
                    <CommandItem
                      key={admin.id}
                      value={admin.id}
                      onSelect={() => selectAdmin(admin)}
                      onMouseDown={(e) => e.preventDefault()}>
                      <UserIcon className="text-muted-foreground size-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate">{customerDisplayName(admin)}</p>
                        <p className="text-muted-foreground truncate text-xs">{admin.email}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowClear && value ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          aria-label="Clear account manager">
          <XIcon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
