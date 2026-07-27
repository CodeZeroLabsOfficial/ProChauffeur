"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import type { CorporateAccount } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CorporateAccountSelect({
  accounts,
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "Search accounts…",
  nested = false
}: {
  accounts: CorporateAccount[];
  value: string | null;
  onChange: (accountId: string | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  nested?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => accounts.find((a) => a.id === value) ?? null,
    [accounts, value]
  );

  const options = useMemo(() => {
    const active = accounts
      .filter((a) => a.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name));
    if (selected && selected.status !== "active") {
      return [selected, ...active.filter((a) => a.id !== selected.id)];
    }
    return active;
  }, [accounts, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive"
          )}>
          <span className="truncate">{selected?.name.trim() || placeholder}</span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[--radix-popover-trigger-width] p-0",
          nested && "z-[110]"
        )}
        align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            <CommandGroup>
              {options.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.name} ${account.id}`}
                  onSelect={() => {
                    onChange(account.id);
                    setOpen(false);
                  }}>
                  <CheckIcon
                    className={cn(
                      "mr-2 size-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{account.name}</span>
                  {account.status !== "active" ? (
                    <span className="text-muted-foreground ml-auto text-xs">Suspended</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
