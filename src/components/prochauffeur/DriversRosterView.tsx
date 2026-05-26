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
import AddDriverNoticeContent from "@/components/prochauffeur/AddDriverNoticeContent";
import FormModal from "@/components/prochauffeur/FormModal";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useAdminDataTable } from "@/hooks/useAdminDataTable";
import { useModal } from "@/hooks/useModal";
import { downloadCsv, matchesSearch } from "@/lib/prochauffeur/adminTable";
import {
  capLabel,
  displayNameForUser,
  resolvedDriverProfile,
} from "@/lib/prochauffeur/display";
import {
  CHAUFFEUR_CATEGORY_LABELS,
  type AppUser,
  type ChauffeurCategory,
} from "@/lib/prochauffeur/types";
import { vehicleDisplayName } from "@/lib/prochauffeur/vehicleHelpers";
import React, { useMemo } from "react";

const DRIVER_TABS = [
  { id: "all", label: "All drivers" },
  { id: "visible", label: "On customer app" },
  { id: "dispatch", label: "Accepts dispatch" },
] as const;

export default function DriversRosterView() {
  const { users } = useAdminDashboard();
  const { isOpen, openModal, closeModal } = useModal();
  const {
    limits,
    hasReceivedOperationsSnapshot,
    actionError,
    clearActionError,
    vehicleForChauffeur,
  } = useAdminOperations();

  const drivers = useMemo(
    () =>
      users
        .filter((u) => u.role === "driver")
        .sort((a, b) =>
          displayNameForUser(a, a.id).localeCompare(
            displayNameForUser(b, b.id),
            undefined,
            { sensitivity: "base" }
          )
        ),
    [users]
  );

  const table = useAdminDataTable({
    rows: drivers,
    rowKey: (d) => d.id,
    tabs: [...DRIVER_TABS],
    filterByTab: (driver, tabId) => {
      const profile = resolvedDriverProfile(driver);
      if (tabId === "visible") return profile.visibleOnCustomerApp;
      if (tabId === "dispatch") return profile.acceptsDispatchAssignments;
      return true;
    },
    filterBySearch: (driver, query) => {
      const profile = resolvedDriverProfile(driver);
      const vehicle = vehicleForChauffeur(driver.id);
      return matchesSearch(
        query,
        displayNameForUser(driver, driver.id),
        driver.email,
        CHAUFFEUR_CATEGORY_LABELS[profile.chauffeurCategory as ChauffeurCategory],
        vehicle ? vehicleDisplayName(vehicle) : ""
      );
    },
    sortValue: (driver, key) => {
      const profile = resolvedDriverProfile(driver);
      const vehicle = vehicleForChauffeur(driver.id);
      switch (key) {
        case "name":
          return displayNameForUser(driver, driver.id);
        case "category":
          return CHAUFFEUR_CATEGORY_LABELS[
            profile.chauffeurCategory as ChauffeurCategory
          ];
        case "email":
          return driver.email;
        case "vehicle":
          return vehicle ? vehicleDisplayName(vehicle) : "";
        default:
          return driver.id;
      }
    },
    defaultSortKey: "name",
    defaultSortDirection: "asc",
  });

  const columns = useMemo<AdminTableColumn<AppUser>[]>(
    () => [
      {
        key: "name",
        header: "Driver",
        sortable: true,
        render: (driver) => (
          <PrimaryCell>{displayNameForUser(driver, driver.id)}</PrimaryCell>
        ),
      },
      {
        key: "category",
        header: "Category",
        sortable: true,
        render: (driver) => {
          const profile = resolvedDriverProfile(driver);
          return (
            <SecondaryCell>
              {
                CHAUFFEUR_CATEGORY_LABELS[
                  profile.chauffeurCategory as ChauffeurCategory
                ]
              }
            </SecondaryCell>
          );
        },
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
        render: (driver) => <SecondaryCell>{driver.email}</SecondaryCell>,
      },
      {
        key: "vehicle",
        header: "Vehicle",
        sortable: true,
        render: (driver) => {
          const vehicle = vehicleForChauffeur(driver.id);
          return (
            <PrimaryCell>
              {vehicle ? vehicleDisplayName(vehicle) : "No vehicle"}
            </PrimaryCell>
          );
        },
      },
      {
        key: "visibility",
        header: "Visibility",
        sortable: false,
        align: "center",
        render: (driver) => {
          const profile = resolvedDriverProfile(driver);
          return (
            <Badge
              color={profile.visibleOnCustomerApp ? "success" : "light"}
              variant="light"
              size="sm"
            >
              {profile.visibleOnCustomerApp ? "Visible" : "Hidden"}
            </Badge>
          );
        },
      },
    ],
    [vehicleForChauffeur]
  );

  const handleExport = () => {
    downloadCsv(
      "drivers-roster.csv",
      ["Driver", "Category", "Email", "Vehicle", "Visibility"],
      table.filteredRows.map((driver) => {
        const profile = resolvedDriverProfile(driver);
        const vehicle = vehicleForChauffeur(driver.id);
        return [
          displayNameForUser(driver, driver.id),
          CHAUFFEUR_CATEGORY_LABELS[
            profile.chauffeurCategory as ChauffeurCategory
          ],
          driver.email,
          vehicle ? vehicleDisplayName(vehicle) : "No vehicle",
          profile.visibleOnCustomerApp ? "Visible" : "Hidden",
        ];
      })
    );
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Drivers" />

      {actionError ? (
        <div className="mb-4">
          <AdminActionBanner message={actionError} onDismiss={clearActionError} />
        </div>
      ) : null}

      <AdminListTableCard
        tableTitle="Drivers list"
        description={`Your chauffeur roster — ${drivers.length}/${capLabel(limits.maxDrivers)} seats used.`}
        tabs={[...DRIVER_TABS]}
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
            Add driver
          </Button>
        }
      >
        <AdminDataTable
          columns={columns}
          rows={table.paginatedRows}
          rowKey={(d) => d.id}
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
          loadingMessage="Loading drivers…"
          emptyTitle="No drivers yet"
          emptyDescription="Driver accounts appear here once provisioned in Firebase."
          renderRowActions={(driver) => (
            <AdminTableRowMenu
              items={[
                {
                  label: "Open profile",
                  href: `/drivers/${driver.id}`,
                },
                {
                  label: "Edit profile",
                  href: `/drivers/${driver.id}/profile`,
                },
                {
                  label: "Vehicle assignment",
                  href: `/drivers/${driver.id}/vehicle`,
                },
              ]}
            />
          )}
        />
      </AdminListTableCard>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Add driver"
      >
        <AddDriverNoticeContent onClose={closeModal} />
      </FormModal>
    </div>
  );
}
