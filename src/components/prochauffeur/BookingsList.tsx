"use client";

import AdminDataTable, {
  type AdminTableColumn,
} from "@/components/prochauffeur/admin-table/AdminDataTable";
import AdminListTableCard from "@/components/prochauffeur/admin-table/AdminListTableCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  PrimaryCell,
  SecondaryCell,
} from "@/components/prochauffeur/admin-table/AdminTableCells";
import AdminTableRowMenu, {
  type AdminTableRowMenuItem,
} from "@/components/prochauffeur/admin-table/AdminTableRowMenu";
import TripStatusBadge from "@/components/prochauffeur/TripStatusBadge";
import AddBookingNoticeContent from "@/components/prochauffeur/AddBookingNoticeContent";
import FormModal from "@/components/prochauffeur/FormModal";
import Button from "@/components/ui/button/Button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminDataTable } from "@/hooks/useAdminDataTable";
import { useModal } from "@/hooks/useModal";
import { downloadCsv, matchesSearch } from "@/lib/prochauffeur/adminTable";
import {
  bookingCardDatePipeTime,
  customerDisplayName,
  statusLabel,
  vehicleSubtitle,
} from "@/lib/prochauffeur/display";
import {
  isUpcomingTripStatus,
  type Trip,
  type TripStatus,
} from "@/lib/prochauffeur/types";
import React, { useMemo } from "react";

const BOOKING_TABS = [
  { id: "all", label: "All bookings" },
  { id: "active", label: "Active" },
  { id: "requested", label: "Requested" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const ACTIVE_STATUSES: TripStatus[] = [
  "accepted",
  "en_route_pickup",
  "in_progress",
];

function tripTabMatch(trip: Trip, tabId: string): boolean {
  if (tabId === "all") return true;
  if (tabId === "active") return ACTIVE_STATUSES.includes(trip.status);
  if (tabId === "requested") return trip.status === "requested";
  if (tabId === "completed") return trip.status === "completed";
  if (tabId === "cancelled") return trip.status === "cancelled";
  return true;
}

function shortTripId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export default function BookingsList() {
  const vm = useAdminDashboard();
  const { isOpen, openModal, closeModal } = useModal();

  const sortedTrips = useMemo(
    () =>
      [...vm.trips].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [vm.trips]
  );

  const table = useAdminDataTable({
    rows: sortedTrips,
    rowKey: (t) => t.id,
    tabs: [...BOOKING_TABS],
    filterByTab: tripTabMatch,
    filterBySearch: (trip, query) =>
      matchesSearch(
        query,
        trip.id,
        customerDisplayName(trip, vm.userById),
        vm.chauffeurName(trip.driverID),
        trip.pickupAddressLine,
        trip.dropoffAddressLine,
        statusLabel(trip.status),
        vehicleSubtitle(trip)
      ),
    sortValue: (trip, key) => {
      switch (key) {
        case "trip":
          return trip.id;
        case "customer":
          return customerDisplayName(trip, vm.userById);
        case "chauffeur":
          return vm.chauffeurName(trip.driverID);
        case "pickup":
          return (trip.scheduledPickupAt ?? trip.createdAt).getTime();
        case "status":
          return trip.status;
        default:
          return trip.createdAt.getTime();
      }
    },
    defaultSortKey: "pickup",
    defaultSortDirection: "desc",
  });

  const columns = useMemo<AdminTableColumn<Trip>[]>(
    () => [
      {
        key: "trip",
        header: "Booking",
        sortable: true,
        render: (trip) => <SecondaryCell>{shortTripId(trip.id)}</SecondaryCell>,
      },
      {
        key: "customer",
        header: "Customer",
        sortable: true,
        render: (trip) => (
          <PrimaryCell>
            {customerDisplayName(trip, vm.userById)}
          </PrimaryCell>
        ),
      },
      {
        key: "chauffeur",
        header: "Chauffeur",
        sortable: true,
        render: (trip) => (
          <PrimaryCell>{vm.chauffeurName(trip.driverID)}</PrimaryCell>
        ),
      },
      {
        key: "pickup",
        header: "Pickup",
        sortable: true,
        render: (trip) => (
          <SecondaryCell>
            {bookingCardDatePipeTime(
              trip.scheduledPickupAt ?? trip.createdAt
            )}
          </SecondaryCell>
        ),
      },
      {
        key: "route",
        header: "Route",
        sortable: false,
        render: (trip) => {
          const route = [trip.pickupAddressLine, trip.dropoffAddressLine]
            .filter(Boolean)
            .join(" → ");
          return (
            <SecondaryCell>
              {route || vehicleSubtitle(trip)}
            </SecondaryCell>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        align: "center",
        render: (trip) => <TripStatusBadge status={trip.status} />,
      },
    ],
    [vm.userById, vm.chauffeurName]
  );

  const handleExport = () => {
    downloadCsv(
      "bookings.csv",
      ["Booking", "Customer", "Chauffeur", "Pickup", "Route", "Status"],
      table.filteredRows.map((trip) => {
        const route = [trip.pickupAddressLine, trip.dropoffAddressLine]
          .filter(Boolean)
          .join(" → ");
        return [
          trip.id,
          customerDisplayName(trip, vm.userById),
          vm.chauffeurName(trip.driverID),
          bookingCardDatePipeTime(trip.scheduledPickupAt ?? trip.createdAt),
          route || vehicleSubtitle(trip),
          statusLabel(trip.status),
        ];
      })
    );
  };

  const bookingMenuItems = (trip: Trip): AdminTableRowMenuItem[] => {
    const items: AdminTableRowMenuItem[] = [
      {
        label: "View details",
        href: `/bookings/${trip.id}`,
      },
    ];
    const mutating = vm.bookingMutationTripID === trip.id;

    if (trip.status === "requested") {
      items.push(
        {
          label: "Confirm",
          onClick: () => vm.confirmTripBooking(trip.id),
          disabled: mutating,
        },
        {
          label: "Decline",
          onClick: () => vm.declineTripBooking(trip.id),
          disabled: mutating,
          destructive: true,
        }
      );
    }

    if (isUpcomingTripStatus(trip.status) && trip.status !== "requested") {
      items.push(
        {
          label: "Mark complete",
          onClick: () => vm.completeTripBooking(trip.id),
          disabled: mutating,
        },
        {
          label: "Cancel trip",
          onClick: () => vm.cancelActiveTrip(trip.id),
          disabled: mutating,
          destructive: true,
        }
      );
    }

    return items;
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Bookings" />

      {vm.bookingActionError ? (
        <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-500">
          {vm.bookingActionError}
          <button
            type="button"
            className="ml-3 underline"
            onClick={vm.clearBookingActionError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <AdminListTableCard
        tableTitle="Bookings list"
        description="Track trip requests and active bookings across your fleet."
        tabs={[...BOOKING_TABS]}
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
            onClick={openModal}
          >
            Add booking
          </Button>
        }
      >
        <AdminDataTable
          columns={columns}
          rows={table.paginatedRows}
          rowKey={(t) => t.id}
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
          loading={!vm.hasReceivedTripsSnapshot}
          loadingMessage="Loading bookings…"
          emptyTitle="No bookings match"
          emptyDescription="New trip requests will appear here in real time."
          renderRowActions={(trip) => (
            <AdminTableRowMenu items={bookingMenuItems(trip)} />
          )}
        />
      </AdminListTableCard>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Add booking"
      >
        <AddBookingNoticeContent onClose={closeModal} />
      </FormModal>
    </div>
  );
}
