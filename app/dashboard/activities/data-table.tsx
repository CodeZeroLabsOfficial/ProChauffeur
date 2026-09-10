"use client";

import * as React from "react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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
import { ArrowUpDown, ChevronDown, Columns, FilterIcon, FileTextIcon } from "lucide-react";

import { useSessionUser } from "@/components/providers/session-provider";
import { useNotifications } from "@/hooks/use-collections";
import { canViewActivityEvent } from "@/lib/auth/staff-access";
import { timeAgo } from "@/app/dashboard/lib/dashboard-metrics";
import type { ActivityNotification, NotificationCategory } from "@/lib/models";
import {
  notificationCategoryIcon,
  notificationCategoryLabel
} from "@/lib/notifications/display";
import { markNotificationRead } from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export type ActivityRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  typeValue: string;
  time: string;
  status: "read" | "unread";
  href?: string;
  actorName?: string;
  onOpen?: () => void;
};

function getTypeColor(typeValue: string) {
  switch (typeValue) {
    case "customer":
    case "profile":
      return "bg-amber-500";
    case "driver":
      return "bg-blue-500";
    case "vehicle":
      return "bg-green-500";
    case "invoice":
      return "bg-purple-500";
    case "admin":
    case "company":
      return "bg-rose-500";
    case "location":
    case "operating_hours":
    case "locale":
    case "pricing":
      return "bg-cyan-500";
    default:
      return "bg-slate-500";
  }
}

function createColumns(): ColumnDef<ActivityRow>[] {
  return [
    {
      accessorKey: "activity",
      header: "Activity",
      cell: ({ row }) => {
        const activity = row.original;
        const Icon = notificationCategoryIcon(activity.typeValue as NotificationCategory);
        const iconColor = getTypeColor(activity.typeValue);
        const content = (
          <div className="space-y-3 rounded-md p-2">
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-white",
                  iconColor
                )}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-sm font-semibold">{activity.title}</div>
                <div className="text-muted-foreground text-sm">{activity.description}</div>
                {activity.actorName ? (
                  <div className="text-muted-foreground text-xs">By {activity.actorName}</div>
                ) : null}
              </div>
            </div>
          </div>
        );

        if (activity.href) {
          return (
            <Link href={activity.href} className="block" onClick={() => activity.onOpen?.()}>
              {content}
            </Link>
          );
        }

        return (
          <button type="button" className="block w-full text-left" onClick={() => activity.onOpen?.()}>
            {content}
          </button>
        );
      }
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <div className="capitalize">{row.getValue("type")}</div>
    },
    {
      accessorKey: "time",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Time
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("time")
    }
  ];
}

const columns = createColumns();

export function ActivitiesDataTable() {
  const session = useSessionUser();
  const { notifications: allNotifications } = useNotifications(200);
  const notifications = useMemo(
    () => allNotifications.filter((n) => canViewActivityEvent(session, n)),
    [allNotifications, session]
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch {
      // Non-blocking when opening a row.
    }
  }, []);

  const activityRow = useCallback(
    (notification: ActivityNotification): ActivityRow => ({
      id: notification.id,
      title: notification.title,
      description: notification.message,
      type: notificationCategoryLabel(notification.category),
      typeValue: notification.category,
      time: timeAgo(notification.createdAt),
      status: notification.readAt ? "read" : "unread",
      href: notification.href,
      actorName: notification.actorName,
      onOpen: notification.readAt ? undefined : () => void handleMarkRead(notification.id)
    }),
    [handleMarkRead]
  );

  const data = useMemo(() => notifications.map(activityRow), [notifications, activityRow]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (typeFilter && row.typeValue !== typeFilter) return false;
      return true;
    });
  }, [data, statusFilter, typeFilter]);

  const types = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of data) {
      if (!seen.has(row.typeValue)) seen.set(row.typeValue, row.type);
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [data]);

  const statuses = [
    { value: "read", label: "Read" },
    { value: "unread", label: "Unread" }
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const title = row.original.title.toLowerCase();
      const description = row.original.description.toLowerCase();
      const type = row.original.type.toLowerCase();
      const actor = row.original.actorName?.toLowerCase() ?? "";
      return (
        title.includes(search) ||
        description.includes(search) ||
        type.includes(search) ||
        actor.includes(search)
      );
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          placeholder="Search activities..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="grow"
        />
        <div className="hidden gap-2 md:flex">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                Status
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0">
              <Command>
                <CommandInput placeholder="Filter" className="h-9" />
                <CommandList>
                  <CommandEmpty>No filter found.</CommandEmpty>
                  <CommandGroup>
                    {statuses.map((status) => (
                      <CommandItem
                        key={status.value}
                        value={status.value}
                        onSelect={() =>
                          setStatusFilter((current) =>
                            current === status.value ? null : status.value
                          )
                        }>
                        {status.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                Type
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0">
              <Command>
                <CommandInput placeholder="Type" className="h-9" />
                <CommandList>
                  <CommandEmpty>No type found.</CommandEmpty>
                  <CommandGroup>
                    {types.map((type) => (
                      <CommandItem
                        key={type.value}
                        value={type.value}
                        onSelect={() =>
                          setTypeFilter((current) => (current === type.value ? null : type.value))
                        }>
                        {type.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="inline md:hidden">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <FilterIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4">
              <div className="grid space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <FilterIcon />
                      Status
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-0">
                    <Command>
                      <CommandInput placeholder="Filter" className="h-9" />
                      <CommandList>
                        <CommandEmpty>No filter found.</CommandEmpty>
                        <CommandGroup>
                          {statuses.map((status) => (
                            <CommandItem
                              key={status.value}
                              value={status.value}
                              onSelect={() =>
                                setStatusFilter((current) =>
                                  current === status.value ? null : status.value
                                )
                              }>
                              {status.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <FileTextIcon />
                      Type
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-0">
                    <Command>
                      <CommandInput placeholder="Type" className="h-9" />
                      <CommandList>
                        <CommandEmpty>No type found.</CommandEmpty>
                        <CommandGroup>
                          {types.map((type) => (
                            <CommandItem
                              key={type.value}
                              value={type.value}
                              onSelect={() =>
                                setTypeFilter((current) =>
                                  current === type.value ? null : type.value
                                )
                              }>
                              {type.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="ms-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isUnread = row.original.status === "unread";
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        isUnread &&
                          "border-l border-l-amber-500 bg-orange-50! dark:bg-amber-950/50!"
                      )}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No recent activity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="text-muted-foreground flex-1 text-sm">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} activities
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
