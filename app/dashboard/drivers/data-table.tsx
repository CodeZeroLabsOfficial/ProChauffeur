"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";

import { useUsers, useRosterChauffeurs } from "@/hooks/use-collections";
import {
  removeDriver,
  saveDriverProfile
} from "@/lib/services/firebase-service";
import {
  CHAUFFEUR_CATEGORIES,
  chauffeurCategoryTitle,
  type ChauffeurCategory
} from "@/lib/models";
import {
  branchDriverToProfile,
  type RosterChauffeur
} from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import { formatDate } from "@/lib/format";
import {
  DriverDispatchListBadge,
  DriverVisibilityListBadge
} from "@/components/driver-list-status-badge";
import { generateAvatarFallback } from "@/lib/utils";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { SHEET_EXIT_ANIMATION_MS } from "@/hooks/use-sheet-display-item";
import { DriverDetailSheet } from "@/app/dashboard/drivers/driver-detail-sheet";
import { DriverEditSheet } from "@/app/dashboard/drivers/driver-edit-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

type DriverRow = RosterChauffeur & {
  searchLabel: string;
  category: string;
  dispatchStatus: "accepting" | "paused";
  visibilityStatus: "active" | "inactive";
};

function multiSelectFilter(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

export function DriversDataTable({
  createOpen,
  onCreateOpenChange
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}) {
  const { users } = useUsers();
  const { chauffeurs, loading } = useRosterChauffeurs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dispatchFilter, setDispatchFilter] = useState<string[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<string[]>([]);

  const candidates = useMemo(
    () => users.filter((u) => u.role !== "driver"),
    [users]
  );

  const data = useMemo<DriverRow[]>(
    () =>
      chauffeurs.map((c) => ({
        ...c,
        searchLabel: [c.user.profile.displayName, c.user.email, c.user.profile.phoneNumber]
          .filter(Boolean)
          .join(" "),
        category: chauffeurCategoryTitle[c.roster.chauffeurCategory],
        dispatchStatus: (c.roster.acceptsDispatchAssignments ? "accepting" : "paused") as
          | "accepting"
          | "paused",
        visibilityStatus: (c.roster.visibleOnCustomerApp ? "active" : "inactive") as
          | "active"
          | "inactive"
      })),
    [chauffeurs]
  );

  const driverTitle = useCallback(
    (c: RosterChauffeur) => c.user.profile.displayName?.trim() || c.user.email || "Chauffeur",
    []
  );

  const setDriverVisibility = useCallback(
    async (c: RosterChauffeur, active: boolean) => {
      if (c.roster.visibleOnCustomerApp === active) return;
      try {
        await saveDriverProfile(
          c.user.id,
          { ...branchDriverToProfile(c.roster), visibleOnCustomerApp: active },
          { driverTitle: driverTitle(c) }
        );
        toast.success(
          active ? "Driver visibility set to active." : "Driver visibility set to inactive."
        );
      } catch {
        toast.error("Could not update driver visibility.");
      }
    },
    [driverTitle]
  );

  const setDispatchAcceptance = useCallback(
    async (c: RosterChauffeur, accepting: boolean) => {
      if (c.roster.acceptsDispatchAssignments === accepting) return;
      try {
        await saveDriverProfile(
          c.user.id,
          { ...branchDriverToProfile(c.roster), acceptsDispatchAssignments: accepting },
          { driverTitle: driverTitle(c) }
        );
        toast.success(
          accepting ? "Driver is now accepting dispatch." : "Dispatch paused for this driver."
        );
      } catch {
        toast.error("Could not update dispatch settings.");
      }
    },
    [driverTitle]
  );

  const handleRemoveDriver = useCallback(
    async (c: RosterChauffeur) => {
      const name = driverTitle(c);
      if (!window.confirm(`Remove ${name} from chauffeurs? Their fleet vehicle will also be removed if one exists.`)) {
        return;
      }
      try {
        await removeDriver(c.user.id, name);
        if (selectedId === c.user.id) {
          setDetailOpen(false);
          setEditOpen(false);
          setSelectedId(null);
        }
        toast.success("Driver removed.");
      } catch {
        toast.error("Could not remove the driver.");
      }
    },
    [driverTitle, selectedId]
  );

  const columns = useMemo<ColumnDef<DriverRow>[]>(
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
        id: "chauffeur",
        accessorFn: (row) => row.user.profile.displayName || row.user.email,
        header: "Chauffeur",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={row.original.user.profile.photoURL ?? undefined} />
              <AvatarFallback>
                {generateAvatarFallback(
                  row.original.user.profile.displayName || row.original.user.email
                )}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium">
              {row.original.user.profile.displayName || "Driver"}
            </div>
          </div>
        ),
        filterFn: (row, _columnId, filterValue) => {
          const q = String(filterValue ?? "")
            .trim()
            .toLowerCase();
          if (!q) return true;
          return row.original.searchLabel.toLowerCase().includes(q);
        }
      },
      {
        id: "category",
        accessorFn: (row) => row.roster.chauffeurCategory,
        header: "Category",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.category}</span>
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "licenceExpiry",
        accessorFn: (row) => formatDate(row.roster.driversLicenseExpiry ?? null),
        header: "Licence expiry",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.roster.driversLicenseExpiry ?? null)}
          </span>
        )
      },
      {
        id: "dispatch",
        accessorKey: "dispatchStatus",
        header: "Dispatch",
        cell: ({ row }) => (
          <DriverDispatchListBadge accepting={row.original.roster.acceptsDispatchAssignments} />
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "visibility",
        accessorKey: "visibilityStatus",
        header: "Visibility",
        cell: ({ row }) => (
          <DriverVisibilityListBadge active={row.original.roster.visibleOnCustomerApp} />
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/drivers/${c.user.id}`}>View details</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Visibility</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          disabled={c.roster.visibleOnCustomerApp}
                          onClick={() => setDriverVisibility(c, true)}>
                          Set active
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!c.roster.visibleOnCustomerApp}
                          onClick={() => setDriverVisibility(c, false)}>
                          Set inactive
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Dispatch</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          disabled={c.roster.acceptsDispatchAssignments}
                          onClick={() => setDispatchAcceptance(c, true)}>
                          Accept dispatch
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!c.roster.acceptsDispatchAssignments}
                          onClick={() => setDispatchAcceptance(c, false)}>
                          Pause dispatch
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleRemoveDriver(c)}>
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
      }
    ],
    [handleRemoveDriver, setDriverVisibility, setDispatchAcceptance]
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

  const selectedChauffeur = useMemo(
    () => (selectedId ? chauffeurs.find((c) => c.user.id === selectedId) ?? null : null),
    [selectedId, chauffeurs]
  );

  useEffect(() => {
    if (createOpen) {
      setDetailOpen(false);
      setEditOpen(false);
      setSelectedId(null);
    }
  }, [createOpen]);

  function openDriver(c: RosterChauffeur) {
    onCreateOpenChange?.(false);
    setSelectedId(c.user.id);
    setEditOpen(false);
    setDetailOpen(true);
  }

  function handleDetailOpenChange(next: boolean) {
    setDetailOpen(next);
    if (!next) {
      setEditOpen(false);
      window.setTimeout(() => setSelectedId(null), SHEET_EXIT_ANIMATION_MS);
    }
  }

  function handleEditOpenChange(next: boolean) {
    if (!next) setEditOpen(false);
  }

  function handleCreateOpenChange(next: boolean) {
    if (next) {
      setDetailOpen(false);
      setEditOpen(false);
      setSelectedId(null);
    }
    onCreateOpenChange?.(next);
  }

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search drivers..."
          searchColumnId="chauffeur"
          nowrap
          filters={
            <>
              <ListFilterPopover
                label="Category"
                options={CHAUFFEUR_CATEGORIES.map((category) => ({
                  value: category,
                  label: chauffeurCategoryTitle[category as ChauffeurCategory]
                }))}
                selected={categoryFilter}
                onSelectedChange={(values) => {
                  setCategoryFilter(values);
                  table.getColumn("category")?.setFilterValue(values.length ? values : undefined);
                }}
              />
              <ListFilterPopover
                label="Dispatch"
                options={[
                  { value: "accepting", label: "Accepting" },
                  { value: "paused", label: "Paused" }
                ]}
                selected={dispatchFilter}
                onSelectedChange={(values) => {
                  setDispatchFilter(values);
                  table.getColumn("dispatch")?.setFilterValue(values.length ? values : undefined);
                }}
              />
              <ListFilterPopover
                label="Visibility"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ]}
                selected={visibilityFilter}
                onSelectedChange={(values) => {
                  setVisibilityFilter(values);
                  table.getColumn("visibility")?.setFilterValue(values.length ? values : undefined);
                }}
              />
            </>
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
                    Loading chauffeurs…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => openDriver(row.original)}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No chauffeurs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </div>

      <DriverDetailSheet
        user={selectedChauffeur?.user ?? null}
        roster={selectedChauffeur?.roster ?? null}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />

      <DriverEditSheet
        user={createOpen ? null : selectedChauffeur?.user ?? null}
        roster={createOpen ? null : selectedChauffeur?.roster ?? null}
        candidates={candidates}
        open={createOpen || editOpen}
        onOpenChange={(next) => {
          if (createOpen) handleCreateOpenChange(next);
          else handleEditOpenChange(next);
        }}
        nested={detailOpen && editOpen}
      />
    </>
  );
}
