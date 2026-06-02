"use client";

import { useMemo, useState } from "react";
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

import { useUsers } from "@/hooks/use-collections";
import {
  CHAUFFEUR_CATEGORIES,
  chauffeurCategoryTitle,
  type ChauffeurCategory,
  type User
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { generateAvatarFallback } from "@/lib/utils";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { DriverEditSheet } from "@/app/dashboard/drivers/driver-edit-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type DriverRow = User & {
  searchLabel: string;
  category: string;
  dispatchStatus: "accepting" | "paused";
  appVisibility: "visible" | "hidden";
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
  const { users, loading } = useUsers();
  const [selected, setSelected] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dispatchFilter, setDispatchFilter] = useState<string[]>([]);
  const [appFilter, setAppFilter] = useState<string[]>([]);

  const candidates = useMemo(
    () => users.filter((u) => u.role !== "driver"),
    [users]
  );

  const data = useMemo<DriverRow[]>(
    () =>
      users
        .filter((u) => u.role === "driver")
        .map((u) => {
          const dp = u.driverProfile;
          return {
            ...u,
            searchLabel: [u.profile.displayName, u.email, u.profile.phoneNumber]
              .filter(Boolean)
              .join(" "),
            category: dp ? chauffeurCategoryTitle[dp.chauffeurCategory] : "—",
            dispatchStatus: (dp?.acceptsDispatchAssignments ? "accepting" : "paused") as
              | "accepting"
              | "paused",
            appVisibility: (dp?.visibleOnCustomerApp ? "visible" : "hidden") as
              | "visible"
              | "hidden"
          };
        })
        .sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName)),
    [users]
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
        accessorFn: (row) => row.profile.displayName || row.email,
        header: "Chauffeur",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback>
                {generateAvatarFallback(
                  row.original.profile.displayName || row.original.email
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {row.original.profile.displayName || "Driver"}
              </div>
              <div className="text-muted-foreground text-xs">{row.original.email}</div>
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
        accessorFn: (row) => row.driverProfile?.chauffeurCategory ?? "",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.category}</span>
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "licenceExpiry",
        accessorFn: (row) => formatDate(row.driverProfile?.driversLicenseExpiry ?? null),
        header: "Licence expiry",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.driverProfile?.driversLicenseExpiry ?? null)}
          </span>
        )
      },
      {
        id: "dispatch",
        accessorKey: "dispatchStatus",
        header: "Dispatch",
        cell: ({ row }) => {
          const status = row.getValue("dispatchStatus") as DriverRow["dispatchStatus"];
          return (
            <Badge variant={status === "accepting" ? "default" : "secondary"}>
              {status === "accepting" ? "Accepting" : "Paused"}
            </Badge>
          );
        },
        filterFn: multiSelectFilter
      },
      {
        id: "customerApp",
        accessorKey: "appVisibility",
        header: "Customer app",
        cell: ({ row }) => {
          const status = row.getValue("appVisibility") as DriverRow["appVisibility"];
          return (
            <Badge variant={status === "visible" ? "outline" : "secondary"}>
              {status === "visible" ? "Visible" : "Hidden"}
            </Badge>
          );
        },
        filterFn: multiSelectFilter
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

  function openDriver(u: User) {
    onCreateOpenChange?.(false);
    setSelected(u);
    setEditOpen(true);
  }

  const sheetOpen = createOpen || editOpen;
  const user = createOpen && !editOpen ? null : selected;

  function handleSheetOpenChange(next: boolean) {
    if (!next) {
      setEditOpen(false);
      setSelected(null);
      onCreateOpenChange?.(false);
    }
  }

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search drivers..."
          searchColumnId="chauffeur"
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
                label="Customer app"
                options={[
                  { value: "visible", label: "Visible" },
                  { value: "hidden", label: "Hidden" }
                ]}
                selected={appFilter}
                onSelectedChange={(values) => {
                  setAppFilter(values);
                  table.getColumn("customerApp")?.setFilterValue(values.length ? values : undefined);
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
                      <TableCell key={cell.id}>
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

      <DriverEditSheet
        user={user}
        candidates={candidates}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  );
}
