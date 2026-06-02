"use client";

import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { Columns } from "lucide-react";

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
  filters
}: {
  table: Table<TData>;
  searchPlaceholder: string;
  searchColumnId: string;
  filters?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {filters}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="ml-auto">
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
