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

import { useUsers, useVehicles } from "@/hooks/use-collections";
import {
  assignFleetVehicle,
  deleteVehicle,
  unassignFleetVehicle
} from "@/lib/services/firebase-service";
import {
  VEHICLE_TYPES,
  effectiveChauffeurUserId,
  vehicleDisplayName,
  vehicleTypeTitle,
  type Vehicle,
  type VehicleType
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { assignmentBadgeIcon, vehicleTierBadgeIcon } from "@/lib/vehicle-badge-icons";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { SHEET_EXIT_ANIMATION_MS } from "@/hooks/use-sheet-display-item";
import { VehicleDetailSheet } from "@/app/dashboard/fleet/vehicle-detail-sheet";
import { VehicleEditSheet } from "@/app/dashboard/fleet/vehicle-edit-sheet";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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

  const defaultCreateDriverId = useMemo(() => {
    const vehicleDriverIds = new Set(vehicles.map((v) => v.driverID));
    return drivers.find((d) => !vehicleDriverIds.has(d.id))?.id;
  }, [drivers, vehicles]);

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

  const handleAssignVehicle = useCallback(
    async (vehicle: Vehicle, chauffeurUserId: string) => {
      try {
        await assignFleetVehicle(vehicles, vehicle.driverID, chauffeurUserId);
        toast.success("Vehicle assigned.");
      } catch {
        toast.error("Could not assign the vehicle.");
      }
    },
    [vehicles]
  );

  const handleUnassignVehicle = useCallback(async (vehicle: Vehicle) => {
    try {
      await unassignFleetVehicle(vehicle.driverID);
      toast.success("Vehicle unassigned.");
    } catch {
      toast.error("Could not unassign the vehicle.");
    }
  }, []);

  const handleDeleteVehicle = useCallback(
    async (vehicle: Vehicle) => {
      const name = vehicleDisplayName(vehicle) || "this vehicle";
      if (!window.confirm(`Delete ${name}? This cannot be undone.`)) {
        return;
      }
      try {
        await deleteVehicle(vehicle.driverID);
        if (selectedId === vehicle.driverID) {
          setDetailOpen(false);
          setEditOpen(false);
          setSelectedId(null);
        }
        toast.success("Vehicle deleted.");
      } catch {
        toast.error("Could not delete the vehicle.");
      }
    },
    [selectedId]
  );

  const openVehicleEdit = useCallback((v: Vehicle) => {
    onCreateOpenChange?.(false);
    setSelectedId(v.driverID);
    setEditOpen(true);
  }, [onCreateOpenChange]);

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
          <div className="flex items-center gap-3">
            <VehicleMakeAvatar make={row.original.make} className="size-9" />
            <div className="font-medium">{vehicleDisplayName(row.original) || "Vehicle"}</div>
          </div>
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
            <IconBadge icon={vehicleTierBadgeIcon}>
              {vehicleTypeTitle[row.original.pricingVehicleType as VehicleType]}
            </IconBadge>
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
            <IconBadge icon={assignmentBadgeIcon(status === "assigned")}>
              {status === "assigned" ? "Assigned" : "Unassigned"}
            </IconBadge>
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
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const vehicle = row.original;
          const assignedChauffeurId = effectiveChauffeurUserId(vehicle);
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
                  <Link href={`/dashboard/fleet/${vehicle.driverID}`}>View profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openVehicleEdit(vehicle)}>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Assignment</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {drivers.length ? (
                      drivers.map((driver) => (
                        <DropdownMenuItem
                          key={driver.id}
                          disabled={assignedChauffeurId === driver.id}
                          onClick={() => handleAssignVehicle(vehicle, driver.id)}>
                          {driver.profile.displayName || driver.email}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No chauffeurs available</DropdownMenuItem>
                    )}
                    {assignedChauffeurId ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUnassignVehicle(vehicle)}>
                          Unassign chauffeur
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteVehicle(vehicle)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
      }
    ],
    [drivers, handleAssignVehicle, handleDeleteVehicle, handleUnassignVehicle, openVehicleEdit]
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

  const selectedVehicle = useMemo(
    () => (selectedId ? vehicles.find((v) => v.driverID === selectedId) ?? null : null),
    [selectedId, vehicles]
  );

  useEffect(() => {
    if (createOpen) {
      setDetailOpen(false);
      setEditOpen(false);
      setSelectedId(null);
    }
  }, [createOpen]);

  function openVehicle(v: Vehicle) {
    onCreateOpenChange?.(false);
    setSelectedId(v.driverID);
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
                    No vehicles yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </div>

      <VehicleDetailSheet
        vehicle={selectedVehicle}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        modal={!editOpen}
      />

      <VehicleEditSheet
        vehicle={createOpen ? null : selectedVehicle}
        defaultCreateDriverId={defaultCreateDriverId}
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
