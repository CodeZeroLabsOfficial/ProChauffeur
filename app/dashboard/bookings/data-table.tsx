"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
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

import { useTrips, useUsers, useVehicles } from "@/hooks/use-collections";
import { canEditBooking } from "@/app/dashboard/bookings/lib/booking-actions";
import { vehicleForChauffeur } from "@/app/dashboard/bookings/lib/chauffeur-assignment";
import { assignTripDriver, updateTripStatus } from "@/lib/services/firebase-service";
import {
  TRIP_STATUSES,
  tripPickupReferenceDate,
  tripStatusTitle,
  vehicleDisplayName,
  type Trip
} from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { endOfDay, startOfDay } from "@/app/dashboard/lib/dashboard-metrics";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { DateRangePicker, thisWeekRange } from "@/components/custom-date-range-picker";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const UNASSIGNED_CHAUFFEUR = "__unassigned__";
const NO_VEHICLE = "__none__";

const ROW_STATUS_ACTIONS = [
  { status: "accepted", label: "Accept" },
  { status: "cancelled", label: "Cancel" },
  { status: "en_route_pickup", label: "Enroute" },
  { status: "in_progress", label: "In progress" }
] as const;

type RowStatusAction = (typeof ROW_STATUS_ACTIONS)[number]["status"];

type BookingRow = Trip & {
  searchLabel: string;
  bookingIdLabel: string;
  chauffeurLabel: string;
  chauffeurFilterValue: string;
  pickupLabel: string;
  vehicleLabel: string;
  vehicleFilterValue: string;
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

export function BookingsDataTable({
  onRebook,
  onEdit
}: {
  onRebook: (trip: Trip) => void;
  onEdit: (trip: Trip) => void;
}) {
  const { trips, loading } = useTrips();
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const [dateRange, setDateRange] = useState<DateRange>(() => thisWeekRange());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [chauffeurFilter, setChauffeurFilter] = useState<string[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState<string[]>([]);

  const changeStatus = useCallback(async (id: string, status: RowStatusAction) => {
    try {
      await updateTripStatus(id, status);
      if (status === "accepted") {
        toast.success("Booking accepted.");
      } else if (status === "cancelled") {
        toast.success("Booking cancelled.");
      } else {
        toast.success(`Marked as ${tripStatusTitle[status]}.`);
      }
    } catch {
      toast.error("Could not update the booking.");
    }
  }, []);

  const reassignChauffeur = useCallback(
    async (tripId: string, chauffeurId: string | null, vehicle?: (typeof vehicles)[number]) => {
      try {
        await assignTripDriver(
          tripId,
          chauffeurId,
          vehicle?.driverID ?? null,
          vehicle ?? null
        );
        toast.success(chauffeurId ? "Chauffeur reassigned." : "Chauffeur unassigned.");
      } catch {
        toast.error("Could not reassign the chauffeur.");
      }
    },
    []
  );

  const driverNameById = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const u of users) map.set(u.id, u.profile.displayName || u.email);
    return map;
  }, [users]);

  const chauffeurOptions = useMemo(
    () => [
      { value: UNASSIGNED_CHAUFFEUR, label: "Unassigned" },
      ...users
        .filter((u) => u.role === "driver")
        .map((u) => ({
          value: u.id,
          label: u.profile.displayName || u.email
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ],
    [users]
  );

  const reassignableChauffeurs = useMemo(
    () =>
      users
        .filter((u) => u.role === "driver")
        .map((u) => ({
          id: u.id,
          label: u.profile.displayName || u.email,
          vehicle: vehicleForChauffeur(vehicles, u.id)
        }))
        .filter((c): c is typeof c & { vehicle: NonNullable<typeof c.vehicle> } => c.vehicle != null)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [users, vehicles]
  );

  const vehicleOptions = useMemo(
    () => [
      { value: NO_VEHICLE, label: "No vehicle" },
      ...vehicles
        .map((v) => ({
          value: v.driverID,
          label: vehicleDisplayName(v)
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ],
    [vehicles]
  );

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
            chauffeurFilterValue: t.driverID ?? UNASSIGNED_CHAUFFEUR,
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
            vehicleLabel: t.vehicleSnapshot ? vehicleDisplayName(t.vehicleSnapshot) : "—",
            vehicleFilterValue:
              t.vehicleDocumentId ?? t.vehicleSnapshot?.driverID ?? NO_VEHICLE
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
          <Link
            href={`/dashboard/bookings/${row.original.id}`}
            className="font-mono text-sm hover:underline"
            title={row.original.id}>
            {row.original.bookingIdLabel}
          </Link>
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
        accessorKey: "chauffeurFilterValue",
        header: "Chauffeur",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.chauffeurLabel}</span>
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "pickupTime",
        accessorKey: "pickupLabel",
        header: "Pickup date and time",
        cell: ({ row }) => row.original.pickupLabel
      },
      {
        id: "vehicle",
        accessorKey: "vehicleFilterValue",
        header: "Vehicle",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.vehicleLabel}</span>
        ),
        filterFn: multiSelectFilter
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
              <DropdownMenuItem
                disabled={!canEditBooking(row.original.status)}
                onClick={() => onEdit(row.original)}>
                Edit booking
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Set status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {ROW_STATUS_ACTIONS.map(({ status, label }) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={row.original.status === status}
                      onClick={() => changeStatus(row.original.id, status)}>
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!canEditBooking(row.original.status)}>
                  Reassign
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    disabled={!row.original.driverID}
                    onClick={() => reassignChauffeur(row.original.id, null)}>
                    Unassigned
                  </DropdownMenuItem>
                  {reassignableChauffeurs.map(({ id, label, vehicle }) => (
                    <DropdownMenuItem
                      key={id}
                      disabled={row.original.driverID === id}
                      onClick={() => reassignChauffeur(row.original.id, id, vehicle)}>
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRebook(row.original)}>Rebook</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={
                  row.original.status === "cancelled" || row.original.status === "completed"
                }
                onClick={() => changeStatus(row.original.id, "cancelled")}>
                Cancel booking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    ],
    [changeStatus, onEdit, onRebook, reassignableChauffeurs, reassignChauffeur]
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
          <>
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
            <ListFilterPopover
              label="Chauffeur"
              options={chauffeurOptions}
              selected={chauffeurFilter}
              onSelectedChange={(values) => {
                setChauffeurFilter(values);
                table.getColumn("chauffeur")?.setFilterValue(values.length ? values : undefined);
              }}
            />
            <ListFilterPopover
              label="Vehicle"
              options={vehicleOptions}
              selected={vehicleFilter}
              onSelectedChange={(values) => {
                setVehicleFilter(values);
                table.getColumn("vehicle")?.setFilterValue(values.length ? values : undefined);
              }}
            />
          </>
        }
        endActions={
          <DateRangePicker
            value={dateRange}
            onChange={(range) => {
              if (range?.from) setDateRange(range);
            }}
            defaultPreset="thisWeek"
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
