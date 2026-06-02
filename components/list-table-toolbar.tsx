"use client";

import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { Columns } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function ListTableToolbar<TData>({
  table,
  searchPlaceholder,
  searchColumnId,
  filters,
  nowrap = false
}: {
  table: Table<TData>;
  searchPlaceholder: string;
  searchColumnId: string;
  filters?: ReactNode;
  nowrap?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-4", nowrap && "flex-nowrap")}>
      <div className={cn("flex gap-2", nowrap ? "min-w-0 flex-1 flex-nowrap" : "flex-wrap")}>
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
          }
          className={cn("max-w-sm", nowrap && "shrink-0")}
        />
        {filters}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn("shrink-0 whitespace-nowrap", !nowrap && "ml-auto")}>
            <Columns /> <span className="hidden md:inline">Columns</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(value)}>
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
