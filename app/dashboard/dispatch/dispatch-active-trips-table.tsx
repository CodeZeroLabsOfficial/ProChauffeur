"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";

import { TripProgressBar } from "@/components/trip-progress-bar";
import { TripStatusBadge } from "@/components/trip-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { tripPickupReferenceDate, type Trip } from "@/lib/models";
import { dispatchMapMode, resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import type { TripProgress } from "@/lib/trip-progress";
import { cn } from "@/lib/utils";

type ActiveTripRow = Trip & {
  chauffeurLabel: string;
  progress: TripProgress;
  waitingForGps: boolean;
};

export function DispatchActiveTripsTable({
  trips,
  progressByTripId,
  locations,
  chauffeurNameById,
  selectedTripId,
  onSelectTrip
}: {
  trips: Trip[];
  progressByTripId: Map<string, TripProgress>;
  locations: DriverLiveLocation[];
  chauffeurNameById: Map<string, string>;
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
}) {
  const rows: ActiveTripRow[] = trips.map((trip) => {
    const mode = dispatchMapMode(trip.status);
    const needsGps = mode === "to_pickup" || mode === "to_dropoff";
    const loc = resolveDriverLocation(trip, locations);
    return {
      ...trip,
      chauffeurLabel: trip.driverID
        ? (chauffeurNameById.get(trip.driverID) ?? "Assigned")
        : "Unassigned",
      progress: progressByTripId.get(trip.id)!,
      waitingForGps: needsGps && !loc
    };
  });

  const columns: ColumnDef<ActiveTripRow>[] = [
    {
      id: "chauffeur",
      header: "Chauffeur",
      cell: ({ row }) => {
        const trip = row.original;
        if (trip.driverID) {
          return (
            <Link
              href={`/dashboard/drivers/${trip.driverID}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium hover:underline">
              {trip.chauffeurLabel}
            </Link>
          );
        }
        return <span className="font-medium">{trip.chauffeurLabel}</span>;
      }
    },
    {
      id: "pickup",
      header: "Pickup",
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDateTime(tripPickupReferenceDate(row.original))}
        </span>
      )
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => (
        <div className="max-w-[280px] truncate text-sm">
          {row.original.pickupAddressLine || "Pickup not set"}
          <span className="text-muted-foreground"> → </span>
          {row.original.dropoffAddressLine || "Destination not set"}
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <TripStatusBadge status={row.original.status} />
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <TripProgressBar
            progress={row.original.progress}
            waitingForGps={row.original.waitingForGps}
          />
        </div>
      )
    }
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id
  });

  if (trips.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm">No active trips.</p>
    );
  }

  return (
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
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={selectedTripId === row.original.id ? "selected" : undefined}
            className={cn("cursor-pointer", selectedTripId === row.original.id && "bg-muted")}
            onClick={() => onSelectTrip(row.original.id)}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
