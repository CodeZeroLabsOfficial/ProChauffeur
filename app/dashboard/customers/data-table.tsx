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

import { useTrips, useUsers } from "@/hooks/use-collections";
import type { User } from "@/lib/models";
import { formatPostalAddress } from "@/lib/models/postal-address";
import { formatDate } from "@/lib/format";
import { customerDisplayName } from "@/lib/users/customer-display";
import {
  lastBookingAtForCustomer,
  tripCountByCustomerId
} from "@/app/dashboard/customers/lib/customer-profile-metrics";
import { generateAvatarFallback } from "@/lib/utils";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { SHEET_EXIT_ANIMATION_MS } from "@/hooks/use-sheet-display-item";
import { CustomerDetailSheet } from "@/app/dashboard/customers/customer-detail-sheet";
import { CustomerEditSheet } from "@/app/dashboard/customers/customer-edit-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type CustomerRow = User & {
  searchLabel: string;
  tripCount: number;
  lastBookingAt: Date | null;
  activityStatus: "has_bookings" | "no_bookings";
};

function multiSelectFilter(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

function truncateAddress(value: string | null | undefined, max = 40): string {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export function CustomersDataTable({
  createOpen,
  onCreateOpenChange
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}) {
  const { users, loading: usersLoading } = useUsers();
  const { trips, loading: tripsLoading } = useTrips();
  const loading = usersLoading || tripsLoading;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [activityFilter, setActivityFilter] = useState<string[]>([]);

  const tripCounts = useMemo(() => tripCountByCustomerId(trips), [trips]);

  const data = useMemo<CustomerRow[]>(
    () =>
      users
        .filter((u) => u.role === "customer")
        .map((u) => {
          const tripCount = tripCounts.get(u.id) ?? 0;
          return {
            ...u,
            searchLabel: [u.profile.displayName, u.email, u.profile.phoneNumber]
              .filter(Boolean)
              .join(" "),
            tripCount,
            lastBookingAt: lastBookingAtForCustomer(trips, u.id),
            activityStatus: (tripCount > 0 ? "has_bookings" : "no_bookings") as
              | "has_bookings"
              | "no_bookings"
          };
        })
        .sort((a, b) =>
          customerDisplayName(a).localeCompare(customerDisplayName(b))
        ),
    [users, trips, tripCounts]
  );

  const openCustomer = useCallback(
    (user: User) => {
      onCreateOpenChange?.(false);
      setSelectedId(user.id);
      setEditOpen(false);
      setDetailOpen(true);
    },
    [onCreateOpenChange]
  );

  const openEdit = useCallback(
    (user: User) => {
      onCreateOpenChange?.(false);
      setSelectedId(user.id);
      setDetailOpen(false);
      setEditOpen(true);
    },
    [onCreateOpenChange]
  );

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
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
        id: "customer",
        accessorFn: (row) => customerDisplayName(row),
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={row.original.profile.photoURL ?? undefined} />
              <AvatarFallback>
                {generateAvatarFallback(
                  row.original.profile.displayName || row.original.email
                )}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium">{customerDisplayName(row.original)}</div>
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
        id: "email",
        accessorFn: (row) => row.email,
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email || "—"}</span>
        )
      },
      {
        id: "phone",
        accessorFn: (row) => row.profile.phoneNumber ?? "",
        header: "Phone",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.profile.phoneNumber?.trim() || "—"}
          </span>
        )
      },
      {
        id: "address",
        accessorFn: (row) => formatPostalAddress(row.profile) ?? "",
        header: "Address",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {truncateAddress(formatPostalAddress(row.original.profile))}
          </span>
        )
      },
      {
        id: "memberSince",
        accessorFn: (row) => row.createdAt.getTime(),
        header: "Member since",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        )
      },
      {
        id: "bookings",
        accessorKey: "tripCount",
        header: "Bookings",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.original.tripCount}</span>
        )
      },
      {
        id: "activity",
        accessorKey: "activityStatus",
        header: () => null,
        cell: () => null,
        enableHiding: true,
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
                <Link href={`/dashboard/customers/${row.original.id}`}>View profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/bookings">Create booking</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    ],
    [openEdit]
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
      columnVisibility: { ...columnVisibility, activity: false },
      rowSelection
    }
  });

  const selectedUser = useMemo(
    () => (selectedId ? users.find((u) => u.id === selectedId) ?? null : null),
    [selectedId, users]
  );

  const selectedTripCount = selectedId ? tripCounts.get(selectedId) ?? 0 : 0;

  useEffect(() => {
    if (createOpen) {
      setDetailOpen(false);
      setEditOpen(false);
      setSelectedId(null);
    }
  }, [createOpen]);

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
          searchPlaceholder="Search customers..."
          searchColumnId="customer"
          nowrap
          filters={
            <ListFilterPopover
              label="Activity"
              options={[
                { value: "has_bookings", label: "Has bookings" },
                { value: "no_bookings", label: "No bookings" }
              ]}
              selected={activityFilter}
              onSelectedChange={(values) => {
                setActivityFilter(values);
                table.getColumn("activity")?.setFilterValue(values.length ? values : undefined);
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
                    Loading customers…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => openCustomer(row.original)}>
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
                    No customers yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </div>

      <CustomerDetailSheet
        user={selectedUser}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        tripCount={selectedTripCount}
      />

      <CustomerEditSheet
        user={createOpen ? null : selectedUser}
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
