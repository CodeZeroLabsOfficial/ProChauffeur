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

function TableColumnsMenu<TData>({ table }: { table: Table<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="shrink-0 whitespace-nowrap">
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
  );
}

export function ListTableToolbar<TData>({
  table,
  searchPlaceholder,
  searchColumnId,
  filters,
  endActions,
  nowrap = false,
  inlineControls = false,
  className
}: {
  table: Table<TData>;
  searchPlaceholder: string;
  searchColumnId: string;
  filters?: ReactNode;
  endActions?: ReactNode;
  nowrap?: boolean;
  /** Search, filters, and columns on one row (no trailing column group). */
  inlineControls?: boolean;
  className?: string;
}) {
  const searchInput = (
    <Input
      placeholder={searchPlaceholder}
      value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""}
      onChange={(event) =>
        table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
      }
      className={cn(
        inlineControls ? "min-w-0 flex-1" : "max-w-sm",
        nowrap && !inlineControls && "shrink-0"
      )}
    />
  );

  if (inlineControls) {
    return (
      <div className={cn("flex min-w-0 w-full flex-nowrap items-center gap-2 py-4", className)}>
        {searchInput}
        {filters}
        {endActions}
        <TableColumnsMenu table={table} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 py-4", nowrap && "flex-nowrap", className)}>
      <div className={cn("flex gap-2", nowrap ? "min-w-0 flex-1 flex-nowrap" : "flex-wrap")}>
        {searchInput}
        {filters}
      </div>
      <div className={cn("flex shrink-0 items-center gap-2", !nowrap && "ml-auto")}>
        {endActions}
        <TableColumnsMenu table={table} />
      </div>
    </div>
  );
}
