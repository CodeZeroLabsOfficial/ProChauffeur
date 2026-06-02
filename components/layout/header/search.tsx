"use client";

import React, { useEffect, useState } from "react";
import { CommandIcon, SearchIcon } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { navGroups } from "@/components/layout/nav-config";

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="lg:flex-1">
      <div className="relative hidden max-w-sm flex-1 lg:block">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="h-9 w-full cursor-pointer rounded-md border pr-4 pl-10 text-sm shadow-xs"
          placeholder="Search..."
          type="search"
          onFocus={() => setOpen(true)}
          readOnly
        />
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          <CommandIcon className="size-3" />
          <span>k</span>
        </div>
      </div>
      <div className="block lg:hidden">
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)}>
          <SearchIcon />
        </Button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {navGroups.map((group, groupIndex) => (
            <React.Fragment key={group.title}>
              <CommandGroup heading={group.title}>
                {group.items.flatMap((item) => {
                  if (item.items?.length) {
                    return item.items.map((sub) => (
                      <CommandItem
                        key={sub.href}
                        onSelect={() => {
                          setOpen(false);
                          router.push(sub.href);
                        }}>
                        {item.icon && <item.icon />}
                        <span>
                          {item.title} · {sub.title}
                        </span>
                      </CommandItem>
                    ));
                  }
                  return (
                    <CommandItem
                      key={item.href}
                      onSelect={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {groupIndex < navGroups.length - 1 && <CommandSeparator />}
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
