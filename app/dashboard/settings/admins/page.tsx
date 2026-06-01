"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useUsers } from "@/hooks/use-collections";
import { updateUserRole } from "@/lib/services/firebase-service";
import type { User } from "@/lib/models";
import { useSessionUser } from "@/components/providers/session-provider";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function AdminsPage() {
  const { users, loading } = useUsers();
  const me = useSessionUser();
  const [promoteId, setPromoteId] = useState("");
  const [busy, setBusy] = useState(false);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);
  const candidates = useMemo(() => users.filter((u) => u.role !== "admin"), [users]);

  async function setRole(u: User, role: "admin" | "customer") {
    setBusy(true);
    try {
      await updateUserRole(u.id, role);
      toast.success(role === "admin" ? "Administrator added." : "Administrator removed.");
      setPromoteId("");
    } catch {
      toast.error("Could not update the role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Grant admin access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={promoteId} onValueChange={setPromoteId}>
              <SelectTrigger className="sm:w-80">
                <SelectValue placeholder="Select a user to promote" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No eligible users
                  </SelectItem>
                ) : (
                  candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.profile.displayName || u.email} ({u.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              disabled={!promoteId || busy}
              onClick={() => {
                const u = users.find((x) => x.id === promoteId);
                if (u) setRole(u, "admin");
              }}>
              Make admin
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-10 text-center">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {generateAvatarFallback(u.profile.displayName || u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.profile.displayName || "Admin"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={u.id === me.uid || busy}
                        onClick={() => setRole(u, "customer")}>
                        {u.id === me.uid ? "You" : "Revoke"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
