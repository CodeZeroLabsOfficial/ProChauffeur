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
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";

import { PromotionDetailSheet } from "@/app/dashboard/promotions/promotion-detail-sheet";
import { PromotionEditSheet } from "@/app/dashboard/promotions/promotion-edit-sheet";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { LocationStatusBadge } from "@/components/location-status-badge";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
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
import { useCompanyVehicleClasses } from "@/hooks/use-company-vehicle-classes";
import { SHEET_EXIT_ANIMATION_MS } from "@/hooks/use-sheet-display-item";
import type { Promotion } from "@/lib/models";
import { listenPromotions } from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";

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

function formatUsageLimit(max: number | null | undefined): string {
  if (max == null) return "Unlimited";
  return String(max);
}

function formatValidity(startsAt: Date | null | undefined, endsAt: Date | null | undefined): string {
  if (!startsAt && !endsAt) return "Always";
  if (startsAt && endsAt) {
    return `${format(startsAt, "MMM d, yyyy")} ù ${format(endsAt, "MMM d, yyyy")}`;
  }
  if (startsAt) return `From ${format(startsAt, "MMM d, yyyy")}`;
  return `Until ${format(endsAt!, "MMM d, yyyy")}`;
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
  const { options: companyClassOptions } = useCompanyVehicleClasses();
  const { allBranches } = useActiveBranch();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    return () => unsubPromo();
  }, []);

  useEffect(() => {
    if (createOpen) {
      setDetailOpen(false);
      setEditOpen(false);
      setSelectedId(null);
    }
  }, [createOpen]);

  function openDetail(promo: Promotion) {
    onCreateOpenChange?.(false);
    setSelectedId(promo.id);
    setEditOpen(false);
    setDetailOpen(true);
  }

  function openEdit(promo: Promotion) {
    onCreateOpenChange?.(false);
    setSelectedId(promo.id);
    setDetailOpen(false);
    setEditOpen(true);
  }

  const selectedPromotion = useMemo(
    () => promotions.find((promo) => promo.id === selectedId) ?? null,
    [promotions, selectedId]
  );

  const vehicleClasses = useMemo(
    () =>
      companyClassOptions.map((option) => ({
        id: option.id,
        displayName: option.label
      })),
    [companyClassOptions]
  );

  const rows = useMemo<PromotionRow[]>(
    () =>
      promotions.map((promo) => ({
        ...promo,
        searchLabel: [promo.title, promo.code, promo.description].filter(Boolean).join(" "),
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
        id: "code",
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <Badge variant="outline" className="rounded-md px-2 py-1 font-mono">
            {row.original.code}
          </Badge>
        )
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const description = row.original.description?.trim();
          return (
            <div className="min-w-0">
              <div className="font-medium">{row.original.title}</div>
              {description ? (
                <div className="text-muted-foreground truncate text-xs">{description}</div>
              ) : null}
            </div>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          const q = String(filterValue ?? "")
            .trim()
            .toLowerCase();
          if (!q) return true;
          return row.original.searchLabel.toLowerCase().includes(q);
        }
      },
      {
        id: "discount",
        accessorFn: (row) => row.value,
        header: "Discount",
        cell: ({ row }) => formatDiscount(row.original),
        enableColumnFilter: false
      },
      {
        id: "usageLimit",
        accessorFn: (row) => row.conditions.maxRedemptions ?? Number.POSITIVE_INFINITY,
        header: "Usage Limit",
        cell: ({ row }) => formatUsageLimit(row.original.conditions.maxRedemptions),
        enableColumnFilter: false
      },
      {
        id: "usedCount",
        accessorKey: "redemptionCount",
        header: "Used Count",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.redemptionCount}</span>
        ),
        enableColumnFilter: false
      },
      {
        id: "validity",
        accessorFn: (row) => row.conditions.startsAt?.getTime() ?? 0,
        header: "Validity",
        cell: ({ row }) =>
          formatValidity(row.original.conditions.startsAt, row.original.conditions.endsAt),
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
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row.original);
              }}>
              <PencilIcon className="size-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false
      }
    ],
    [onCreateOpenChange]
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

  function handleDetailOpenChange(next: boolean) {
    setDetailOpen(next);
    if (!next) {
      setEditOpen(false);
      window.setTimeout(() => setSelectedId(null), SHEET_EXIT_ANIMATION_MS);
    }
  }

  function handleEditOpenChange(next: boolean) {
    setEditOpen(next);
    if (!next) {
      window.setTimeout(() => {
        if (!detailOpen) setSelectedId(null);
      }, SHEET_EXIT_ANIMATION_MS);
    }
  }

  function handleCreateOpenChange(next: boolean) {
    if (next) {
      setDetailOpen(false);
      setEditOpen(false);
      setSelectedId(null);
    }
    onCreateOpenChange?.(next);
  }

  const editSheetOpen = Boolean(createOpen) || editOpen;
  const editSheetPromotion = createOpen ? null : selectedPromotion;

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search promotionsù"
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
                    Loading promotionsù
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
                    onClick={() => openDetail(row.original)}>
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

      <PromotionDetailSheet
        promotion={selectedPromotion}
        branches={allBranches}
        vehicleClasses={vehicleClasses}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />

      <PromotionEditSheet
        promotion={editSheetPromotion}
        branches={allBranches}
        vehicleClasses={vehicleClasses}
        open={editSheetOpen}
        onOpenChange={(next) => {
          if (createOpen) handleCreateOpenChange(next);
          else handleEditOpenChange(next);
        }}
      />
    </>
  );
}
