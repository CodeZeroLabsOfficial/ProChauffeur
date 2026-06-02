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

import { useUsers, useVehicles } from "@/hooks/use-collections";
import {
  VEHICLE_TYPES,
  effectiveChauffeurUserId,
  vehicleDisplayName,
  vehicleTypeTitle,
  type Vehicle,
  type VehicleType
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { VehicleEditSheet } from "@/app/dashboard/fleet/vehicle-edit-sheet";
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

type FleetRow = Vehicle & {
  chauffeurName: string;
  assignmentStatus: "assigned" | "unassigned";
};

function multiSelectFilter(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

export function FleetDataTable({
  createOpen,
  onCreateOpenChange
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}) {
  const { vehicles, loading } = useVehicles();
  const { users } = useUsers();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    assignment: false
  });
  const [rowSelection, setRowSelection] = useState({});
  const [tierFilter, setTierFilter] = useState<string[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<string[]>([]);

  const drivers = useMemo(() => users.filter((u) => u.role === "driver"), [users]);

  const driverNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.id, u.profile.displayName || u.email);
    return map;
  }, [users]);

  const data = useMemo<FleetRow[]>(
    () =>
      vehicles.map((v) => {
        const chauffeur = effectiveChauffeurUserId(v);
        return {
          ...v,
          chauffeurName: chauffeur ? (driverNameById.get(chauffeur) ?? "Unknown") : "Unassigned",
          assignmentStatus: (chauffeur ? "assigned" : "unassigned") as "assigned" | "unassigned"
        };
      }),
    [vehicles, driverNameById]
  );

  const columns = useMemo<ColumnDef<FleetRow>[]>(
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
        id: "vehicle",
        accessorFn: (row) => vehicleDisplayName(row) || "Vehicle",
        header: "Vehicle",
        cell: ({ row }) => (
          <span className="font-medium">{vehicleDisplayName(row.original) || "Vehicle"}</span>
        ),
        filterFn: (row, _columnId, filterValue) => {
          const q = String(filterValue ?? "")
            .trim()
            .toLowerCase();
          if (!q) return true;
          return [vehicleDisplayName(row.original), row.original.licensePlate].some((s) =>
            s.toLowerCase().includes(q)
          );
        }
      },
      {
        accessorKey: "licensePlate",
        header: "Plate",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("licensePlate") || "—"}</span>
        )
      },
      {
        id: "tier",
        accessorFn: (row) => row.pricingVehicleType ?? "",
        header: "Tier",
        cell: ({ row }) =>
          row.original.pricingVehicleType ? (
            <Badge variant="outline">
              {vehicleTypeTitle[row.original.pricingVehicleType as VehicleType]}
            </Badge>
          ) : (
            "—"
          ),
        filterFn: multiSelectFilter
      },
      {
        accessorKey: "passengerCapacity",
        header: "Capacity",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("passengerCapacity")}</span>
        )
      },
      {
        accessorKey: "chauffeurName",
        header: "Assigned chauffeur",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("chauffeurName")}</span>
        )
      },
      {
        id: "assignment",
        accessorKey: "assignmentStatus",
        header: "Assignment",
        cell: ({ row }) => {
          const status = row.getValue("assignmentStatus") as FleetRow["assignmentStatus"];
          return (
            <Badge variant={status === "assigned" ? "default" : "secondary"}>
              {status === "assigned" ? "Assigned" : "Unassigned"}
            </Badge>
          );
        },
        filterFn: multiSelectFilter
      },
      {
        id: "registrationExpiry",
        accessorFn: (row) => formatDate(row.registrationExpiry ?? null),
        header: "Rego expiry",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.registrationExpiry ?? null)}
          </span>
        )
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

  function openVehicle(v: Vehicle) {
    onCreateOpenChange?.(false);
    setSelected(v);
    setEditOpen(true);
  }

  const sheetOpen = createOpen || editOpen;
  const vehicle = createOpen && !editOpen ? null : selected;

  function handleSheetOpenChange(next: boolean) {
    if (!next) {
      setEditOpen(false);
      setSelected(null);
      onCreateOpenChange?.(false);
    }
  }

  function handleTierFilter(values: string[]) {
    setTierFilter(values);
    table.getColumn("tier")?.setFilterValue(values.length ? values : undefined);
  }

  function handleAssignmentFilter(values: string[]) {
    setAssignmentFilter(values);
    table.getColumn("assignment")?.setFilterValue(values.length ? values : undefined);
  }

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search vehicles..."
          searchColumnId="vehicle"
          nowrap
          filters={
            <>
              <ListFilterPopover
                label="Tier"
                options={VEHICLE_TYPES.map((type) => ({
                  value: type,
                  label: vehicleTypeTitle[type]
                }))}
                selected={tierFilter}
                onSelectedChange={handleTierFilter}
              />
              <ListFilterPopover
                label="Assignment"
                options={[
                  { value: "assigned", label: "Assigned" },
                  { value: "unassigned", label: "Unassigned" }
                ]}
                selected={assignmentFilter}
                onSelectedChange={handleAssignmentFilter}
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
                    Loading fleet…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => openVehicle(row.original)}>
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
                    No vehicles yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </div>

      <VehicleEditSheet
        vehicle={vehicle}
        drivers={drivers}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  );
}
