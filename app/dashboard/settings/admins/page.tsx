"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useUsers } from "@/hooks/use-collections";
import { updateUserRole } from "@/lib/services/firebase-service";
import type { User } from "@/lib/models";
import { useSessionUser } from "@/components/providers/session-provider";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
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
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);

  async function setRole(u: User, role: "admin" | "customer") {
    setBusy(true);
    try {
      await updateUserRole(u.id, role);
      toast.success(role === "admin" ? "Administrator added." : "Administrator removed.");
    } catch {
      toast.error("Could not update the role.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setSaving(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not create administrator.");
        return;
      }
      toast.success("Administrator created.");
      setAddOpen(false);
      e.currentTarget.reset();
    } catch {
      toast.error("Could not create administrator.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardAction>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add Admin
            </Button>
          </CardAction>
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

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Admin</SheetTitle>
            <SheetDescription>
              Creates a Firebase Authentication account and an admin user document.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onAddAdmin} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create admin"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
