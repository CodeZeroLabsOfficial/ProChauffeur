"use client";

import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import AdminDataTable, {
  type AdminTableColumn,
} from "@/components/prochauffeur/admin-table/AdminDataTable";
import AdminListTableCard from "@/components/prochauffeur/admin-table/AdminListTableCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  PrimaryCell,
  SecondaryCell,
} from "@/components/prochauffeur/admin-table/AdminTableCells";
import AdminTableRowMenu from "@/components/prochauffeur/admin-table/AdminTableRowMenu";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import FleetVehicleForm from "@/components/prochauffeur/FleetVehicleForm";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useAdminDataTable } from "@/hooks/useAdminDataTable";
import { useModal } from "@/hooks/useModal";
import { downloadCsv, matchesSearch } from "@/lib/prochauffeur/adminTable";
import { displayNameForUser } from "@/lib/prochauffeur/display";
import { VEHICLE_TYPE_LABELS, type Vehicle } from "@/lib/prochauffeur/types";
import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
} from "@/lib/prochauffeur/vehicleHelpers";
import Link from "next/link";
import React, { useMemo, useState } from "react";

const FLEET_TABS = [
  { id: "all", label: "All vehicles" },
  { id: "assigned", label: "Assigned" },
  { id: "unassigned", label: "Unassigned" },
] as const;

function fleetAssignmentStatus(vehicle: Vehicle): "assigned" | "unassigned" {
  return effectiveChauffeurUserId(vehicle) ? "assigned" : "unassigned";
}

export default function FleetManagementView() {
  const {
    vehicles,
    hasReceivedOperationsSnapshot,
    actionError,
    clearActionError,
  } = useAdminOperations();
  const { userById } = useAdminDashboard();
  const { isOpen, openModal, closeModal } = useModal();
  const [addVehicleKey, setAddVehicleKey] = useState(0);

  function openAddVehicleModal() {
    setAddVehicleKey((key) => key + 1);
    openModal();
  }

  function chauffeurLabel(vehicle: Vehicle): string {
    const assigned = effectiveChauffeurUserId(vehicle);
    if (!assigned) return "Unassigned";
    return displayNameForUser(userById.get(assigned), assigned);
  }

  const table = useAdminDataTable({
    rows: vehicles,
    rowKey: (v) => v.driverID,
    tabs: [...FLEET_TABS],
    filterByTab: (vehicle, tabId) => {
      const status = fleetAssignmentStatus(vehicle);
      if (tabId === "assigned") return status === "assigned";
      if (tabId === "unassigned") return status === "unassigned";
      return true;
    },
    filterBySearch: (vehicle, query) =>
      matchesSearch(
        query,
        vehicleDisplayName(vehicle),
        vehicle.licensePlate,
        vehicle.make,
        vehicle.model,
        VEHICLE_TYPE_LABELS[vehicle.pricingVehicleType],
        chauffeurLabel(vehicle)
      ),
    sortValue: (vehicle, key) => {
      switch (key) {
        case "vehicle":
          return vehicleDisplayName(vehicle);
        case "type":
          return VEHICLE_TYPE_LABELS[vehicle.pricingVehicleType];
        case "plate":
          return vehicle.licensePlate;
        case "chauffeur":
          return chauffeurLabel(vehicle);
        case "status":
          return fleetAssignmentStatus(vehicle);
        default:
          return vehicle.driverID;
      }
    },
    defaultSortKey: "vehicle",
    defaultSortDirection: "asc",
  });

  const columns = useMemo<AdminTableColumn<Vehicle>[]>(
    () => [
      {
        key: "vehicle",
        header: "Vehicle",
        sortable: true,
        render: (vehicle) => (
          <PrimaryCell>{vehicleDisplayName(vehicle)}</PrimaryCell>
        ),
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        render: (vehicle) => (
          <SecondaryCell>
            {VEHICLE_TYPE_LABELS[vehicle.pricingVehicleType]}
          </SecondaryCell>
        ),
      },
      {
        key: "plate",
        header: "Plate",
        sortable: true,
        render: (vehicle) => (
          <SecondaryCell>{vehicle.licensePlate || "—"}</SecondaryCell>
        ),
      },
      {
        key: "chauffeur",
        header: "Chauffeur",
        sortable: true,
        render: (vehicle) => <PrimaryCell>{chauffeurLabel(vehicle)}</PrimaryCell>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        align: "center",
        render: (vehicle) => {
          const assigned = fleetAssignmentStatus(vehicle) === "assigned";
          return (
            <Badge color={assigned ? "success" : "light"} variant="light" size="sm">
              {assigned ? "Assigned" : "Unassigned"}
            </Badge>
          );
        },
      },
    ],
    [userById]
  );

  const handleExport = () => {
    downloadCsv(
      "fleet-vehicles.csv",
      ["Vehicle", "Type", "Plate", "Chauffeur", "Status"],
      table.filteredRows.map((vehicle) => [
        vehicleDisplayName(vehicle),
        VEHICLE_TYPE_LABELS[vehicle.pricingVehicleType],
        vehicle.licensePlate,
        chauffeurLabel(vehicle),
        fleetAssignmentStatus(vehicle) === "assigned" ? "Assigned" : "Unassigned",
      ])
    );
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Fleet" />

      {actionError ? (
        <div className="mb-4">
          <AdminActionBanner message={actionError} onDismiss={clearActionError} />
        </div>
      ) : null}

      <AdminListTableCard
        tableTitle="Fleet list"
        description="Manage vehicles, assignments, and availability for dispatch."
        tabs={[...FLEET_TABS]}
        activeTabId={table.activeTabId}
        tabCounts={table.tabCounts}
        onTabChange={table.setTab}
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search…"
        onFilter={table.resetFilters}
        onExport={handleExport}
        primaryAction={
          <Button
            size="sm"
            startIcon={<span aria-hidden>+</span>}
            onClick={openAddVehicleModal}
          >
            Add vehicle
          </Button>
        }
      >
        <AdminDataTable
          columns={columns}
          rows={table.paginatedRows}
          rowKey={(v) => v.driverID}
          sortKey={table.sortKey}
          sortDirection={table.sortDirection}
          onSort={table.toggleSort}
          selectedIds={table.selectedIds}
          onToggleRow={table.toggleRow}
          onToggleAllOnPage={table.toggleAllOnPage}
          allOnPageSelected={table.allOnPageSelected}
          currentPage={table.currentPage}
          totalPages={table.totalPages}
          onPageChange={table.setCurrentPage}
          totalCount={table.totalCount}
          loading={!hasReceivedOperationsSnapshot}
          loadingMessage="Loading fleet…"
          emptyTitle="No fleet vehicles"
          emptyDescription="Add vehicles to assign them to chauffeurs and show them in booking."
          renderRowActions={(vehicle) => (
            <AdminTableRowMenu
              items={[
                {
                  label: "View & edit",
                  href: `/fleet/${vehicle.driverID}`,
                },
              ]}
            />
          )}
        />
      </AdminListTableCard>

      <FleetVehicleForm
        key={addVehicleKey}
        variant="modal"
        isOpen={isOpen}
        onClose={closeModal}
        onSuccess={closeModal}
        onCancel={closeModal}
      />
    </div>
  );
}
