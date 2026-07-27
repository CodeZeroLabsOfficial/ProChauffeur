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
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AccountEditSheet } from "@/app/dashboard/accounts/account-edit-sheet";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useUsers } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import {
  corporateAccountStatusTitle,
  corporateRateModeTitle,
  type CorporateAccount,
  type CorporateBillingDay
} from "@/lib/models";
import { deleteCorporateAccount, listenCorporateAccounts } from "@/lib/services/firebase-service";

type AccountRow = CorporateAccount & {
  searchLabel: string;
  membersCount: number;
};

function formatBillingDay(day: CorporateBillingDay): string {
  if (day === "last") return "Last day";
  return String(day);
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
  const { users } = useUsers();
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<CorporateAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      if (user.role !== "customer" || !user.corporateAccountId) continue;
      counts.set(user.corporateAccountId, (counts.get(user.corporateAccountId) ?? 0) + 1);
    }
    return counts;
  }, [users]);

  const rows = useMemo<AccountRow[]>(
    () =>
      accounts.map((account) => ({
        ...account,
        searchLabel: [account.name, account.billingEmail, account.joinCode]
          .filter(Boolean)
          .join(" "),
        membersCount: memberCounts.get(account.id) ?? 0
      })),
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
        id: "rateMode",
        accessorKey: "rateMode",
        header: "Rate mode",
        cell: ({ row }) => corporateRateModeTitle[row.original.rateMode],
        enableColumnFilter: false
      },
      {
        id: "billingDay",
        accessorFn: (row) => formatBillingDay(row.billingDay),
        header: "Billing day",
        enableColumnFilter: false
      },
      {
        id: "billingEmail",
        accessorKey: "billingEmail",
        header: "Billing email",
        cell: ({ row }) => row.original.billingEmail || "—",
        enableColumnFilter: false
      },
      {
        id: "members",
        accessorKey: "membersCount",
        header: "Members",
        cell: ({ row }) => row.original.membersCount,
        enableColumnFilter: false
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDelete(row.original);
              }}>
              <Trash2Icon className="size-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false
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

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCorporateAccount(pendingDelete.id);
      toast.success("Account deleted.");
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account.");
    } finally {
      setDeleting(false);
    }
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
                    <TableHead
                      key={header.id}
                      className={header.id === "actions" ? "w-12" : undefined}>
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
                          cell.column.id === "actions" || cell.column.id === "select"
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

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setPendingDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDelete?.name || "this account"}. Unlink all
              members first. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => void confirmDelete(e)}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
