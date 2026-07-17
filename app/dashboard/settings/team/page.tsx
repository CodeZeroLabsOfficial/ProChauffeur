"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useUsers } from "@/hooks/use-collections";
import { userRoleTitle, type User } from "@/lib/models";
import { useSessionUser } from "@/components/providers/session-provider";
import { generateAvatarFallback } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export default function TeamPage() {
  const { users, loading } = useUsers();
  const me = useSessionUser();
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleOpenFor, setRoleOpenFor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);

  function requestDelete(u: User) {
    setRoleOpenFor(null);
    setPendingDelete(u);
  }

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    const u = pendingDelete;
    setBusy(true);
    try {
      const res = await fetch(`/api/admins/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not delete member.");
        return;
      }
      setPendingDelete(null);
      toast.success("Member deleted.");
    } catch {
      toast.error("Could not delete member.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
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
      formEl.reset();
      setAddOpen(false);
      toast.success("Administrator created.");
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
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage your team members and their permissions.</CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Invite Member
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-10 text-center">Loading…</p>
          ) : (
            <div className="divide-y">
              {admins.map((u) => {
                const isSelf = u.id === me.uid;
                return (
                  <div key={u.id} className="flex min-w-0 items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage src={u.profile.photoURL ?? undefined} />
                        <AvatarFallback>
                          {generateAvatarFallback(u.profile.displayName || u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">
                          {u.profile.displayName || "Admin"}
                          {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Popover
                        open={roleOpenFor === u.id}
                        onOpenChange={(isOpen) => setRoleOpenFor(isOpen ? u.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf || busy}
                            className="w-32 justify-between font-normal">
                            {userRoleTitle[u.role]}
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                          <Command>
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => setRoleOpenFor(null)}
                                  className="items-start px-4 py-2">
                                  <div>
                                    <p>Admin</p>
                                    <p className="text-muted-foreground text-sm">
                                      Full access to the dashboard.
                                    </p>
                                  </div>
                                  <CheckIcon className="text-primary ml-auto size-4" />
                                </CommandItem>
                                <CommandItem
                                  onSelect={() => requestDelete(u)}
                                  className="items-start px-4 py-2">
                                  <div>
                                    <p className="text-destructive">Delete</p>
                                    <p className="text-muted-foreground text-sm">
                                      Deletes this member&apos;s account and dashboard access.
                                    </p>
                                  </div>
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isSelf || busy}
                            onClick={() => requestDelete(u)}>
                            {isSelf ? "Cannot delete yourself" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {pendingDelete?.profile.displayName || pendingDelete?.email || "this member"}
              &apos;s account and remove their dashboard access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(e) => void confirmDelete(e)}>
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Invite Member</SheetTitle>
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
