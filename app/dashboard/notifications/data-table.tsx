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
import {
  ArrowUpDown,
  CalendarClockIcon,
  ChevronDown,
  Columns,
  FilterIcon,
  FileTextIcon
} from "lucide-react";
import { toast } from "sonner";

import { useNotifications, useTrips, useUsers } from "@/hooks/use-collections";
import { timeAgo } from "@/app/dashboard/lib/dashboard-metrics";
import type { ActivityNotification, NotificationCategory, Trip } from "@/lib/models";
import {
  notificationCategoryIcon,
  notificationCategoryLabel
} from "@/lib/notifications/display";
import { markNotificationRead, updateTripStatus } from "@/lib/services/firebase-service";
import { generateAvatarFallback, cn } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type NotificationRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  typeValue: string;
  time: string;
  status: "read" | "unread";
  href?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  actions?: Array<{
    label: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    onClick?: () => void;
  }>;
  onOpen?: () => void;
};

function bookingRequestDescription(trip: Trip) {
  const pickup = trip.pickupAddressLine?.trim() || "Pickup";
  const dropoff = trip.dropoffAddressLine?.trim() || "Drop-off";
  return `${pickup} → ${dropoff}`;
}

function customerNameForTrip(trip: Trip, displayNameByCustomerId: Map<string, string>) {
  const fromTrip = trip.customerDisplayName?.trim();
  if (fromTrip) return fromTrip;
  const fromUser = displayNameByCustomerId.get(trip.customerID);
  if (fromUser) return fromUser;
  return "Customer";
}

function getTypeColor(typeValue: string) {
  switch (typeValue) {
    case "booking":
      return "bg-amber-500";
    case "driver":
      return "bg-blue-500";
    case "vehicle":
      return "bg-green-500";
    case "invoice":
      return "bg-purple-500";
    case "admin":
      return "bg-rose-500";
    default:
      return "bg-slate-500";
  }
}

function createColumns(): ColumnDef<NotificationRow>[] {
  return [
    {
      accessorKey: "notification",
      header: "Notification",
      cell: ({ row }) => {
        const notification = row.original;
        const Icon =
          notification.typeValue === "booking"
            ? CalendarClockIcon
            : notificationCategoryIcon(notification.typeValue as NotificationCategory);
        const iconColor = getTypeColor(notification.typeValue);
        const content = (
          <div className="space-y-3 rounded-md p-2">
            <div className="flex gap-4">
              {notification.user ? (
                <Avatar className="size-10">
                  <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
                  <AvatarFallback>{generateAvatarFallback(notification.user.name)}</AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full text-white",
                    iconColor
                  )}>
                  <Icon className="size-4" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="text-sm font-semibold">
                  {notification.user ? notification.user.name : notification.title}
                </div>
                <div className="text-muted-foreground text-sm">{notification.description}</div>
                {notification.actions && notification.actions.length > 0 ? (
                  <div className="mt-3 flex gap-2">
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          action.onClick?.();
                        }}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );

        if (notification.href) {
          return (
            <Link
              href={notification.href}
              className="block"
              onClick={() => notification.onOpen?.()}>
              {content}
            </Link>
          );
        }

        return content;
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

export function NotificationsDataTable() {
  const { trips } = useTrips();
  const { notifications } = useNotifications(200);
  const { users } = useUsers();
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);

  const displayNameByCustomerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      const name = u.profile.displayName?.trim() || u.email;
      if (name) map.set(u.id, name);
    }
    return map;
  }, [users]);

  const photoURLByCustomerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      const url = u.profile.photoURL?.trim();
      if (url) map.set(u.id, url);
    }
    return map;
  }, [users]);

  const handleStatusChange = useCallback(async (tripId: string, status: "accepted" | "cancelled") => {
    setActingOnId(tripId);
    try {
      await updateTripStatus(tripId, status);
      toast.success(status === "accepted" ? "Booking accepted." : "Booking declined.");
    } catch {
      toast.error("Could not update the booking.");
    } finally {
      setActingOnId(null);
    }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch {
      // Non-blocking when navigating from a row.
    }
  }, []);

  const activityRow = useCallback(
    (notification: ActivityNotification): NotificationRow => ({
      id: notification.id,
      title: notification.title,
      description: notification.message,
      type: notificationCategoryLabel(notification.category),
      typeValue: notification.category,
      time: timeAgo(notification.createdAt),
      status: notification.readAt ? "read" : "unread",
      href: notification.href,
      onOpen: notification.readAt ? undefined : () => void handleMarkRead(notification.id)
    }),
    [handleMarkRead]
  );

  const data = useMemo(() => {
    const bookingRows: NotificationRow[] = trips
      .filter((t) => t.status === "requested")
      .map((trip) => {
        const title = customerNameForTrip(trip, displayNameByCustomerId);
        const avatarUrl = photoURLByCustomerId.get(trip.customerID);
        const busy = actingOnId === trip.id;

        return {
          id: `booking-${trip.id}`,
          title,
          description: `Requested a new booking · ${bookingRequestDescription(trip)}`,
          type: "Booking",
          typeValue: "booking",
          time: timeAgo(trip.createdAt),
          status: "unread" as const,
          href: `/dashboard/bookings/${trip.id}`,
          user: {
            name: title,
            avatar: avatarUrl
          },
          actions: [
            {
              label: "Accept",
              variant: "outline" as const,
              onClick: busy ? undefined : () => void handleStatusChange(trip.id, "accepted")
            },
            {
              label: "Decline",
              variant: "destructive" as const,
              onClick: busy ? undefined : () => void handleStatusChange(trip.id, "cancelled")
            }
          ]
        };
      });

    const activityRows = notifications.map(activityRow);
    return [...bookingRows, ...activityRows].sort((a, b) => {
      const aUnread = a.status === "unread" ? 1 : 0;
      const bUnread = b.status === "unread" ? 1 : 0;
      return bUnread - aUnread;
    });
  }, [
    trips,
    notifications,
    displayNameByCustomerId,
    photoURLByCustomerId,
    actingOnId,
    handleStatusChange,
    activityRow
  ]);

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
      return title.includes(search) || description.includes(search) || type.includes(search);
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
          placeholder="Search notifications..."
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
                    No results.
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
            of {table.getFilteredRowModel().rows.length} notification(s)
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
