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

import { PromotionEditSheet } from "@/app/dashboard/promotions/promotion-edit-sheet";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
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
import { LocationStatusBadge } from "@/components/location-status-badge";
import { Badge } from "@/components/ui/badge";
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
import { useVehicleClasses } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import type { Branch, Promotion } from "@/lib/models";
import {
  deletePromotion,
  listenBranches,
  listenPromotions
} from "@/lib/services/firebase-service";

type PromotionRow = Promotion & {
  searchLabel: string;
  status: "active" | "inactive";
};

function formatDiscount(promo: Promotion): string {
  if (promo.type === "percent") {
    return `${Math.round(promo.value * 10000) / 100}%`;
  }
  return promo.value.toFixed(2);
}

function multiSelectFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown
) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

export function PromotionsDataTable({
  createOpen = false,
  onCreateOpenChange
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}) {
  const { vehicleClasses } = useVehicleClasses();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    setLoading(true);
    const unsubPromo = listenPromotions((rows) => {
      setPromotions(rows);
      setLoading(false);
    });
    const unsubBranches = listenBranches(setBranches);
    return () => {
      unsubPromo();
      unsubBranches();
    };
  }, []);

  const rows = useMemo<PromotionRow[]>(
    () =>
      promotions.map((promo) => ({
        ...promo,
        searchLabel: [promo.title, promo.code].filter(Boolean).join(" "),
        status: promo.isEnabled ? "active" : "inactive"
      })),
    [promotions]
  );

  const columns = useMemo<ColumnDef<PromotionRow>[]>(
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
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
        filterFn: (row, _columnId, filterValue) => {
          const q = String(filterValue ?? "")
            .trim()
            .toLowerCase();
          if (!q) return true;
          return row.original.searchLabel.toLowerCase().includes(q);
        }
      },
      {
        id: "code",
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono">
            {row.original.code}
          </Badge>
        )
      },
      {
        id: "discount",
        accessorFn: (row) => row.value,
        header: "Discount",
        cell: ({ row }) => formatDiscount(row.original),
        enableColumnFilter: false
      },
      {
        id: "uses",
        accessorKey: "redemptionCount",
        header: "Uses",
        cell: ({ row }) => {
          const max = row.original.conditions.maxRedemptions;
          return (
            <>
              {row.original.redemptionCount}
              {max != null ? ` / ${max}` : ""}
            </>
          );
        },
        enableColumnFilter: false
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <LocationStatusBadge isActive={row.original.isEnabled} />,
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
    data: rows,
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

  function openEdit(promo: Promotion) {
    onCreateOpenChange?.(false);
    setEditing(promo);
    setEditOpen(true);
  }

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deletePromotion(pendingDelete.id);
      toast.success("Promotion deleted.");
      if (editing?.id === pendingDelete.id) {
        setEditOpen(false);
        setEditing(null);
      }
      setPendingDelete(null);
    } catch {
      toast.error("Could not delete promotion.");
    } finally {
      setDeleting(false);
    }
  }

  const sheetOpen = Boolean(createOpen) || editOpen;
  const sheetPromotion = createOpen ? null : editing;

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search promotions…"
          searchColumnId="title"
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
                    <TableHead key={header.id} className={header.id === "actions" ? "w-12" : undefined}>
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
                    Loading promotions…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "cursor-pointer",
                      !row.original.isEnabled && "text-muted-foreground"
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
                    No promotions yet.
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
            <AlertDialogTitle>Delete promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {pendingDelete?.title || pendingDelete?.code || "this promotion"}. This action cannot
              be undone.
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

      <PromotionEditSheet
        promotion={sheetPromotion}
        branches={branches}
        vehicleClasses={vehicleClasses}
        open={sheetOpen}
        onOpenChange={(next) => {
          if (createOpen) handleCreateOpenChange(next);
          else handleEditOpenChange(next);
        }}
      />
    </>
  );
}
