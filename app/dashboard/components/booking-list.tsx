"use client";

import { useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search
} from "lucide-react";

import { useTrips } from "@/hooks/use-collections";
import { tripPickupReferenceDate, type Trip } from "@/lib/models/trip";
import { vehicleTypeTitle, type VehicleType } from "@/lib/models/enums";
import { formatDateTime } from "@/lib/format";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { tripStatusTitle, TRIP_STATUSES, type TripStatus } from "@/lib/models/enums";

interface BookingRow {
  bookingId: string;
  guestName: string;
  vehicleType: string;
  vehicleLabel: string;
  duration: string;
  pickupAt: string;
  status: TripStatus;
}

function shortBookingId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function vehicleTypeLabel(trip: Trip) {
  const type = trip.vehicleSnapshot?.pricingVehicleType;
  return type ? vehicleTypeTitle[type as VehicleType] : "Unassigned";
}

function vehicleLabel(trip: Trip) {
  const v = trip.vehicleSnapshot;
  if (!v) return "—";
  return `${v.make} ${v.model}`.trim();
}

function durationLabel(trip: Trip) {
  const passengers = trip.bookingPassengerCount ?? 1;
  return `${passengers} pax`;
}

function toRow(trip: Trip): BookingRow {
  const pickup = tripPickupReferenceDate(trip);
  return {
    bookingId: shortBookingId(trip.id),
    guestName: trip.customerDisplayName || "Customer",
    vehicleType: vehicleTypeLabel(trip),
    vehicleLabel: vehicleLabel(trip),
    duration: durationLabel(trip),
    pickupAt: formatDateTime(pickup),
    status: trip.status
  };
}

const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "bookingId",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-muted-foreground px-0 font-normal hover:bg-transparent">
        Booking ID
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-foreground">{row.getValue("bookingId")}</span>
  },
  {
    accessorKey: "guestName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-muted-foreground px-0 font-normal hover:bg-transparent">
        Guest name
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-foreground">{row.getValue("guestName")}</span>
  },
  {
    accessorKey: "vehicleType",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-muted-foreground px-0 font-normal hover:bg-transparent">
        Vehicle type
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-lime-400" />
        <Badge
          variant="outline"
          className="border-lime-300 bg-lime-50 font-normal text-lime-700 dark:border-lime-900 dark:bg-lime-950 dark:text-lime-300">
          {row.getValue("vehicleType")}
        </Badge>
      </div>
    )
  },
  {
    accessorKey: "vehicleLabel",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-muted-foreground px-0 font-normal hover:bg-transparent">
        Vehicle
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-foreground">{row.getValue("vehicleLabel")}</span>
  },
  {
    accessorKey: "duration",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-muted-foreground px-0 font-normal hover:bg-transparent">
        Passengers
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-foreground">{row.getValue("duration")}</span>
  },
  {
    accessorKey: "pickupAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-muted-foreground px-0 font-normal hover:bg-transparent">
        Pick-up
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-foreground">{row.getValue("pickupAt")}</span>
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-muted-foreground px-0 font-normal hover:bg-transparent">
          Status
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-end">
        <TripStatusBadge status={row.getValue("status")} />
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === "all") return true;
      return row.getValue(columnId) === filterValue;
    }
  }
];

export function BookingList() {
  const { trips } = useTrips();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const bookings = useMemo(
    () =>
      [...trips]
        .sort(
          (a, b) =>
            tripPickupReferenceDate(b).getTime() - tripPickupReferenceDate(a).getTime()
        )
        .map(toRow),
    [trips]
  );

  const table = useReactTable({
    data: bookings,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters
    },
    initialState: {
      pagination: {
        pageSize: 4
      }
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      setColumnFilters([]);
    } else {
      setColumnFilters([{ id: "status", value }]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between space-y-4 lg:flex-row lg:items-center lg:space-y-0">
          <CardTitle>Booking list</CardTitle>
          <div className="flex items-center gap-3">
            <InputGroup>
              <InputGroupInput
                placeholder="Search guest, status, etc"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {TRIP_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {tripStatusTitle[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="bg-muted py-2 first:rounded-tl-lg first:rounded-bl-lg last:rounded-tr-lg last:rounded-br-lg">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
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

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}>
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}>
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}>
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}>
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
