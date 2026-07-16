"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { MoreHorizontalIcon } from "lucide-react";

import { LocationEditSheet } from "@/app/dashboard/locations/location-edit-sheet";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { LocationStatusBadge } from "@/components/location-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { Branch } from "@/lib/models";
import { listenBranches } from "@/lib/services/firebase-service";

type LocationRow = Branch & {
  searchLabel: string;
  postcodeCount: number;
  status: "active" | "inactive";
};

function multiSelectFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown
) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

export function LocationsDataTable({
  createOpen,
  onCreateOpenChange,
  canCreate
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  useEffect(() => {
    return listenBranches((rows) => {
      setBranches(rows.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
  }, []);

  const data = useMemo<LocationRow[]>(
    () =>
      branches.map((branch) => {
        const postcodeCount =
          branch.serviceArea?.type === "postcodes"
            ? (branch.serviceArea.postcodes ?? []).length
            : 0;
        return {
          ...branch,
          searchLabel: [branch.name, branch.officeAddressLine].filter(Boolean).join(" "),
          postcodeCount,
          status: branch.isActive ? "active" : "inactive"
        };
      }),
    [branches]
  );

  const columns = useMemo<ColumnDef<LocationRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        filterFn: (row, _columnId, filterValue) => {
          const q = String(filterValue ?? "")
            .trim()
            .toLowerCase();
          if (!q) return true;
          return row.original.searchLabel.toLowerCase().includes(q);
        }
      },
      {
        id: "office",
        accessorFn: (row) => row.officeAddressLine ?? "",
        header: "Office",
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-[18rem] truncate block">
            {row.original.officeAddressLine?.trim() || "—"}
          </span>
        )
      },
      {
        id: "postcodes",
        accessorKey: "postcodeCount",
        header: "Postcodes",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.postcodeCount > 0 ? `${row.original.postcodeCount} listed` : "—"}
          </span>
        )
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <LocationStatusBadge isActive={row.original.isActive !== false} />
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <span className="sr-only">Open menu</span>
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/locations/${row.original.id}`}>Open</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setEditing(row.original);
                  setEditOpen(true);
                }}>
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    }
  });

  function handleCreateOpenChange(next: boolean) {
    if (next) {
      setEditOpen(false);
      setEditing(null);
    }
    onCreateOpenChange?.(next);
  }

  function handleEditOpenChange(next: boolean) {
    setEditOpen(next);
    if (!next) setEditing(null);
  }

  const sheetOpen = Boolean(createOpen) || editOpen;
  const sheetBranch = createOpen ? null : editing;

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search locations..."
          searchColumnId="name"
          nowrap
          filters={
            <ListFilterPopover
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" }
              ]}
              selected={statusFilter}
              onSelectedChange={(values) => {
                setStatusFilter(values);
                table.getColumn("status")?.setFilterValue(values.length ? values : undefined);
              }}
            />
          }
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading locations…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/locations/${row.original.id}`)}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={
                          cell.column.id === "actions" || cell.column.id === "select"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No locations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </div>

      <LocationEditSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          if (createOpen) handleCreateOpenChange(next);
          else handleEditOpenChange(next);
        }}
        branch={sheetBranch}
        canCreate={canCreate}
        onSaved={(b) => {
          if (!createOpen) setEditing(b);
        }}
      />
    </>
  );
}
