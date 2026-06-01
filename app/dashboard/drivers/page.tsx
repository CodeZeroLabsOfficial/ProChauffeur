"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { useUsers } from "@/hooks/use-collections";
import { chauffeurCategoryTitle, type User } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { generateAvatarFallback } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DriverEditSheet } from "@/app/dashboard/drivers/driver-edit-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function DriversPage() {
  const { users, loading } = useUsers();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  const drivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.role === "driver")
      .filter((u) =>
        !q
          ? true
          : [u.profile.displayName, u.email, u.profile.phoneNumber]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(q))
      )
      .sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
  }, [users, search]);

  function openDriver(u: User) {
    setSelected(u);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Drivers"
        description="Manage your chauffeurs, compliance and dispatch availability."
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search chauffeurs…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Licence expiry</TableHead>
                <TableHead>Dispatch</TableHead>
                <TableHead>Customer app</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    Loading chauffeurs…
                  </TableCell>
                </TableRow>
              ) : drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    No chauffeurs yet.
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((u) => {
                  const dp = u.driverProfile;
                  return (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer"
                      onClick={() => openDriver(u)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>
                              {generateAvatarFallback(u.profile.displayName || u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{u.profile.displayName || "Driver"}</div>
                            <div className="text-muted-foreground text-xs">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dp ? chauffeurCategoryTitle[dp.chauffeurCategory] : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(dp?.driversLicenseExpiry ?? null)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dp?.acceptsDispatchAssignments ? "default" : "secondary"}>
                          {dp?.acceptsDispatchAssignments ? "Accepting" : "Paused"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dp?.visibleOnCustomerApp ? "outline" : "secondary"}>
                          {dp?.visibleOnCustomerApp ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DriverEditSheet user={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
