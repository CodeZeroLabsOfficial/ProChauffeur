"use client";

import { useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
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

import { useTrips, useUsers } from "@/hooks/use-collections";
import { updateTripStatus } from "@/lib/services/firebase-service";
import {
  TRIP_STATUSES,
  tripPickupReferenceDate,
  tripStatusTitle,
  type Trip,
  type TripStatus
} from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { endOfDay, startOfDay } from "@/app/dashboard/lib/dashboard-metrics";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { DateRangePicker, last7DaysRange } from "@/components/custom-date-range-picker";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

type BookingRow = Trip & {
  searchLabel: string;
  bookingIdLabel: string;
  chauffeurLabel: string;
  pickupLabel: string;
  vehicleLabel: string;
};

function shortBookingId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function multiSelectFilter(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

function tripInDateRange(trip: Trip, range: DateRange | undefined) {
  if (!range?.from) return true;
  const ref = tripPickupReferenceDate(trip);
  const start = startOfDay(range.from);
  const end = endOfDay(range.to ?? range.from);
  return ref >= start && ref <= end;
}

export function BookingsDataTable() {
  const { trips, loading } = useTrips();
  const { users } = useUsers();
  const [dateRange, setDateRange] = useState<DateRange>(() => last7DaysRange());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const changeStatus = useCallback(async (id: string, status: TripStatus) => {
    try {
      await updateTripStatus(id, status);
      toast.success(`Marked as ${tripStatusTitle[status]}.`);
    } catch {
      toast.error("Could not update the booking.");
    }
  }, []);

  const driverNameById = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const u of users) map.set(u.id, u.profile.displayName || u.email);
    return map;
  }, [users]);

  const data = useMemo<BookingRow[]>(
    () =>
      trips
        .filter((t) => tripInDateRange(t, dateRange))
        .map((t) => {
          const chauffeurLabel = t.driverID
            ? (driverNameById.get(t.driverID) ?? "Unknown")
            : "Unassigned";
          return {
            ...t,
            bookingIdLabel: shortBookingId(t.id),
            chauffeurLabel,
            searchLabel: [
              t.id,
              shortBookingId(t.id),
              t.customerDisplayName,
              t.customerPhoneNumber,
              chauffeurLabel
            ]
              .filter(Boolean)
              .join(" "),
            pickupLabel: formatDateTime(tripPickupReferenceDate(t)),
            vehicleLabel: t.vehicleSnapshot
              ? `${t.vehicleSnapshot.color} ${t.vehicleSnapshot.make} ${t.vehicleSnapshot.model}`.trim()
              : "—"
          };
        }),
    [trips, dateRange, driverNameById]
  );

  const columns = useMemo<ColumnDef<BookingRow>[]>(
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
          />
        ),
        enableSorting: false,
        enableHiding: false
      },
      {
        id: "bookingId",
        accessorKey: "bookingIdLabel",
        header: "Booking ID",
        cell: ({ row }) => (
          <span className="font-mono text-sm" title={row.original.id}>
            {row.original.bookingIdLabel}
          </span>
        )
      },
      {
        id: "customer",
        accessorFn: (row) => row.customerDisplayName || "Customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.customerDisplayName || "Customer"}</div>
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
        id: "chauffeur",
        accessorKey: "chauffeurLabel",
        header: "Chauffeur",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.chauffeurLabel}</span>
        )
      },
      {
        id: "pickupTime",
        accessorKey: "pickupLabel",
        header: "Pickup date and time",
        cell: ({ row }) => row.original.pickupLabel
      },
      {
        id: "vehicle",
        accessorKey: "vehicleLabel",
        header: "Vehicle",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.vehicleLabel}</span>
        )
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <TripStatusBadge status={row.getValue("status")} />,
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
              <DropdownMenuLabel>Set status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TRIP_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  disabled={s === row.original.status}
                  onClick={() => changeStatus(row.original.id, s)}>
                  {tripStatusTitle[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    ],
    [changeStatus]
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

  return (
    <div className="w-full">
      <ListTableToolbar
        table={table}
        searchPlaceholder="Search bookings..."
        searchColumnId="customer"
        nowrap
        filters={
          <ListFilterPopover
            label="Status"
            options={TRIP_STATUSES.map((status) => ({
              value: status,
              label: tripStatusTitle[status]
            }))}
            selected={statusFilter}
            onSelectedChange={(values) => {
              setStatusFilter(values);
              table.getColumn("status")?.setFilterValue(values.length ? values : undefined);
            }}
          />
        }
        endActions={
          <DateRangePicker
            value={dateRange}
            onChange={(range) => {
              if (range?.from) setDateRange(range);
            }}
            className="shrink-0"
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
                  Loading bookings…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                  No bookings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <ListTablePagination table={table} />
    </div>
  );
}
