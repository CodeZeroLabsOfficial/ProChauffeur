"use client";

import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ListFilterOption = {
  value: string;
  label: string;
};

export function ListFilterPopover({
  label,
  options,
  selected,
  onSelectedChange
}: {
  label: string;
  options: ListFilterOption[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onSelectedChange(selected.filter((v) => v !== value));
    } else {
      onSelectedChange([...selected, value]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <PlusCircle />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0">
        <Command>
          <CommandInput placeholder={label} className="h-9" />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}>
                  <div className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id={`${label}-${option.value}`}
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => toggle(option.value)}
                    />
                    <label
                      htmlFor={`${label}-${option.value}`}
                      className="leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {option.label}
                    </label>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
