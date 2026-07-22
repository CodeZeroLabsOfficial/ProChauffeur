"use client";

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
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { LocationEditSheet } from "@/app/dashboard/locations/location-edit-sheet";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { LocationStatusBadge } from "@/components/location-status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { Branch } from "@/lib/models";
import { formatServiceAreaSummary } from "@/lib/branch/service-area";
import { cn } from "@/lib/utils";
import { deleteBranch, listenBranches } from "@/lib/services/firebase-service";

type LocationRow = Branch & {
  searchLabel: string;
  serviceAreaSummary: string | null;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      branches.map((branch) => ({
        ...branch,
        searchLabel: [branch.name, branch.officeAddressLine].filter(Boolean).join(" "),
        serviceAreaSummary: formatServiceAreaSummary(branch.serviceArea),
        status: branch.isActive ? "active" : "inactive"
      })),
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
        id: "serviceArea",
        accessorFn: (row) => row.serviceAreaSummary ?? "",
        header: "Service area",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.serviceAreaSummary ?? "—"}
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
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDelete(row.original);
              }}>
              <Trash2Icon className="size-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false
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

  function openEdit(location: Branch) {
    onCreateOpenChange?.(false);
    setEditing(location);
    setEditOpen(true);
  }

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteBranch(pendingDelete.id);
      toast.success("Location deleted.");
      if (editing?.id === pendingDelete.id) {
        setEditOpen(false);
        setEditing(null);
      }
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete location.");
    } finally {
      setDeleting(false);
    }
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
                    <TableHead
                      key={header.id}
                      className={header.id === "actions" ? "w-12" : undefined}>
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
                    className={cn(
                      "cursor-pointer",
                      row.original.isActive === false && "text-muted-foreground"
                    )}
                    onClick={() => openEdit(row.original)}>
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

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setPendingDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDelete?.name || "this location"} and all of its
              bookings, vehicles, pricing, operating hours, and settings. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => void confirmDelete(e)}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LocationEditSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          if (createOpen) handleCreateOpenChange(next);
          else handleEditOpenChange(next);
        }}
        branch={sheetBranch}
        canCreate={canCreate}
        onSaved={(b) => {
          if (createOpen) {
            onCreateOpenChange?.(false);
            setEditing(b);
            setEditOpen(true);
          } else {
            setEditing(b);
          }
        }}
      />
    </>
  );
}
