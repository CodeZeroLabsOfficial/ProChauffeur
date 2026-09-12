"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "next/navigation";

import { AccountEditSheet } from "@/app/dashboard/accounts/account-edit-sheet";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
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
import { useUsersByRole } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import {
  corporateAccountStatusTitle,
  formatCorporateAddress,
  type CorporateAccount
} from "@/lib/models";
import { listenCorporateAccounts } from "@/lib/services/firebase-service";

type AccountRow = CorporateAccount & {
  searchLabel: string;
  addressLabel: string;
  membersCount: number;
};

function truncateAddress(value: string | null | undefined, max = 40): string {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function multiSelectFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown
) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

export function AccountsDataTable({
  createOpen = false,
  onCreateOpenChange
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const { users } = useUsersByRole("customer", 200);
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    setLoading(true);
    return listenCorporateAccounts((rows) => {
      setAccounts(rows);
      setLoading(false);
    });
  }, []);

  const memberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      if (!user.corporateAccountId) continue;
      counts.set(user.corporateAccountId, (counts.get(user.corporateAccountId) ?? 0) + 1);
    }
    return counts;
  }, [users]);

  const rows = useMemo<AccountRow[]>(
    () =>
      accounts.map((account) => {
        const addressLabel = formatCorporateAddress(account) ?? "";
        return {
          ...account,
          addressLabel,
          searchLabel: [account.name, account.email, account.phone, addressLabel, account.joinCode]
            .filter(Boolean)
            .join(" "),
          membersCount: memberCounts.get(account.id) ?? 0
        };
      }),
    [accounts, memberCounts]
  );

  const columns = useMemo<ColumnDef<AccountRow>[]>(
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
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        filterFn: (row, _columnId, filterValue) => {
          const q = String(filterValue ?? "")
            .trim()
            .toLowerCase();
          if (!q) return true;
          return row.original.searchLabel.toLowerCase().includes(q);
        }
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "font-medium",
              row.original.status === "active"
                ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            )}>
            {corporateAccountStatusTitle[row.original.status]}
          </Badge>
        ),
        filterFn: multiSelectFilter
      },
      {
        id: "address",
        accessorKey: "addressLabel",
        header: "Address",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {truncateAddress(row.original.addressLabel)}
          </span>
        ),
        enableColumnFilter: false
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "—",
        enableColumnFilter: false
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone || "—",
        enableColumnFilter: false
      },
      {
        id: "members",
        accessorKey: "membersCount",
        header: "Members",
        cell: ({ row }) => row.original.membersCount,
        enableColumnFilter: false
      }
    ],
    []
  );

  const table = useReactTable({
    data: rows,
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

  function handleCreateOpenChange(next: boolean) {
    onCreateOpenChange?.(next);
  }

  return (
    <>
      <div className="w-full">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search accounts…"
          searchColumnId="name"
          nowrap
          filters={
            <ListFilterPopover
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" }
              ]}
              selected={statusFilter}
              onSelectedChange={(values) => {
                setStatusFilter(values);
                table.getColumn("status")?.setFilterValue(values.length ? values : undefined);
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
                    Loading accounts…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "cursor-pointer",
                      row.original.status === "suspended" && "text-muted-foreground"
                    )}
                    onClick={() => router.push(`/dashboard/accounts/${row.original.id}`)}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={
                          cell.column.id === "select"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No accounts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </div>

      <AccountEditSheet
        account={null}
        open={Boolean(createOpen)}
        onOpenChange={handleCreateOpenChange}
        onSaved={(created) => {
          handleCreateOpenChange(false);
          router.push(`/dashboard/accounts/${created.id}`);
        }}
      />
    </>
  );
}
