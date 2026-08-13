"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useSessionUser } from "@/components/providers/session-provider";
import { MultiSelectField } from "@/components/multi-select-field";
import { useUsers } from "@/hooks/use-collections";
import {
  parseStaffRole,
  type StaffGrantInput
} from "@/lib/auth/staff-access";
import {
  STAFF_ROLES,
  staffRoleDescription,
  staffRoleTitle,
  type StaffRole,
  type User
} from "@/lib/models";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

const DEFAULT_INVITE_ROLE: StaffRole = "manager";

function memberStaffRole(user: User): StaffRole {
  return parseStaffRole(user.staffRole) ?? "admin";
}

function grantLabel(user: User, namesById: Map<string, string>): string {
  if (user.canAccessAllBranches) return "All Locations";
  const ids = user.branchIds?.filter(Boolean) ?? [];
  if (ids.length === 0) return "No locations";
  return ids.map((id) => namesById.get(id) ?? id).join(", ");
}

function grantsFromUser(user: User): Pick<StaffGrantInput, "canAccessAllBranches" | "branchIds"> {
  if (user.canAccessAllBranches) {
    return { canAccessAllBranches: true, branchIds: null };
  }
  return {
    canAccessAllBranches: false,
    branchIds: user.branchIds?.filter(Boolean) ?? []
  };
}

export default function TeamPage() {
  const { users, loading } = useUsers();
  const me = useSessionUser();
  const { branches } = useActiveBranch();
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleOpenFor, setRoleOpenFor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [inviteRole, setInviteRole] = useState<StaffRole>(DEFAULT_INVITE_ROLE);
  const [inviteAllLocations, setInviteAllLocations] = useState(true);
  const [inviteBranchIds, setInviteBranchIds] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<StaffRole>("admin");
  const [editAllLocations, setEditAllLocations] = useState(true);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);
  const locationOptions = useMemo(
    () => branches.map((branch) => ({ value: branch.id, label: branch.name })),
    [branches]
  );
  const namesById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );
  const callerCanGrantAll = me.canAccessAllBranches === true;

  function resetInvite() {
    setInviteRole(DEFAULT_INVITE_ROLE);
    setInviteAllLocations(callerCanGrantAll);
    setInviteBranchIds([]);
  }

  function openEdit(user: User) {
    setRoleOpenFor(null);
    setEditing(user);
    setEditRole(memberStaffRole(user));
    const grants = grantsFromUser(user);
    setEditAllLocations(grants.canAccessAllBranches);
    setEditBranchIds(grants.branchIds ?? []);
  }

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

  async function patchMember(
    uid: string,
    payload: {
      staffRole: StaffRole;
      canAccessAllBranches: boolean;
      branchIds: string[] | null;
    }
  ) {
    const res = await fetch(`/api/admins/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not update member.");
    }
  }

  async function onChangeRole(user: User, staffRole: StaffRole) {
    if (user.id === me.uid) return;
    setBusy(true);
    try {
      const grants = grantsFromUser(user);
      await patchMember(user.id, {
        staffRole,
        canAccessAllBranches: grants.canAccessAllBranches,
        branchIds: grants.branchIds
      });
      setRoleOpenFor(null);
      toast.success("Role updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editAllLocations && editBranchIds.length === 0) {
      toast.error("Allocate at least one Location, or choose All Locations.");
      return;
    }
    setSaving(true);
    try {
      await patchMember(editing.id, {
        staffRole: editing.id === me.uid ? memberStaffRole(editing) : editRole,
        canAccessAllBranches: editAllLocations,
        branchIds: editAllLocations ? null : editBranchIds
      });
      setEditing(null);
      toast.success("Access updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update member.");
    } finally {
      setSaving(false);
    }
  }

  async function onAddAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!inviteAllLocations && inviteBranchIds.length === 0) {
      toast.error("Allocate at least one Location, or choose All Locations.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          staffRole: inviteRole,
          canAccessAllBranches: inviteAllLocations,
          branchIds: inviteAllLocations ? null : inviteBranchIds
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not create member.");
        return;
      }
      formEl.reset();
      resetInvite();
      setAddOpen(false);
      toast.success("Member created.");
    } catch {
      toast.error("Could not create member.");
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
            <Button
              size="sm"
              onClick={() => {
                resetInvite();
                setAddOpen(true);
              }}>
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
                const role = memberStaffRole(u);
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
                          {u.profile.displayName || staffRoleTitle[role]}
                          {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">{u.email}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {grantLabel(u, namesById)}
                        </p>
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
                            {staffRoleTitle[role]}
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="end">
                          <Command>
                            <CommandList>
                              <CommandGroup>
                                {STAFF_ROLES.map((option) => (
                                  <CommandItem
                                    key={option}
                                    onSelect={() => void onChangeRole(u, option)}
                                    className="items-start px-4 py-2">
                                    <div>
                                      <p>{staffRoleTitle[option]}</p>
                                      <p className="text-muted-foreground text-sm">
                                        {staffRoleDescription[option]}
                                      </p>
                                    </div>
                                    {option === role ? (
                                      <CheckIcon className="text-primary ml-auto size-4" />
                                    ) : null}
                                  </CommandItem>
                                ))}
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
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            Edit access
                          </DropdownMenuItem>
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

      <Sheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetInvite();
        }}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Invite Member</SheetTitle>
            <SheetDescription>
              Set a staff role and allocate Locations when creating the account.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onAddAdmin} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 px-4">
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
              <StaffRoleField id="invite-role" value={inviteRole} onChange={setInviteRole} />
              <LocationGrantFields
                allLocations={inviteAllLocations}
                onAllLocationsChange={setInviteAllLocations}
                branchIds={inviteBranchIds}
                onBranchIdsChange={setInviteBranchIds}
                options={locationOptions}
                canGrantAll={callerCanGrantAll}
              />
            </div>
            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-4 sm:justify-between">
              <span />
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create member"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit access</SheetTitle>
            <SheetDescription>
              {editing?.profile.displayName || editing?.email || "Team member"}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onSaveEdit} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 px-4">
              <StaffRoleField
                id="edit-role"
                value={editRole}
                onChange={setEditRole}
                disabled={editing?.id === me.uid}
              />
              <LocationGrantFields
                allLocations={editAllLocations}
                onAllLocationsChange={setEditAllLocations}
                branchIds={editBranchIds}
                onBranchIdsChange={setEditBranchIds}
                options={locationOptions}
                canGrantAll={callerCanGrantAll}
              />
            </div>
            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-4 sm:justify-between">
              <span />
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StaffRoleField({
  id,
  value,
  onChange,
  disabled
}: {
  id: string;
  value: StaffRole;
  onChange: (role: StaffRole) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Staff role</Label>
      <Select value={value} onValueChange={(next) => onChange(next as StaffRole)} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAFF_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {staffRoleTitle[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">{staffRoleDescription[value]}</p>
    </div>
  );
}

function LocationGrantFields({
  allLocations,
  onAllLocationsChange,
  branchIds,
  onBranchIdsChange,
  options,
  canGrantAll
}: {
  allLocations: boolean;
  onAllLocationsChange: (value: boolean) => void;
  branchIds: string[];
  onBranchIdsChange: (ids: string[]) => void;
  options: { value: string; label: string }[];
  canGrantAll: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label>Locations</Label>
      {canGrantAll ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allLocations}
            onCheckedChange={(checked) => onAllLocationsChange(checked === true)}
          />
          All Locations
        </label>
      ) : null}
      {allLocations && canGrantAll ? (
        <p className="text-muted-foreground text-xs">
          Includes every current and future Location.
        </p>
      ) : (
        <MultiSelectField
          options={options}
          selected={branchIds}
          onSelectedChange={onBranchIdsChange}
          placeholder="Select locations"
          emptyMessage="No Locations."
        />
      )}
    </div>
  );
}
