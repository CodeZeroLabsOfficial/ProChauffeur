"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Unlink
} from "lucide-react";
import { toast } from "sonner";

import { CustomerAutocomplete } from "@/components/customer-autocomplete";
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
import type { CorporateAccount, User } from "@/lib/models";
import {
  fetchCorporateAccountMembers,
  linkCustomerToCorporateAccount,
  saveCorporateAccount
} from "@/lib/services/firebase-service";
import { customerDisplayName } from "@/lib/users/customer-display";
import { generateAvatarFallback } from "@/lib/utils";

type ContactRoleLabel = "Member" | "Primary" | "Billing" | "Primary & Billing";

function contactRoleLabel(
  userId: string,
  primaryId: string | null | undefined,
  billingId: string | null | undefined
): ContactRoleLabel {
  const isPrimary = userId === primaryId?.trim();
  const isBilling = userId === billingId?.trim();
  if (isPrimary && isBilling) return "Primary & Billing";
  if (isPrimary) return "Primary";
  if (isBilling) return "Billing";
  return "Member";
}

export function AccountMembersTab({
  account,
  onSaved
}: {
  account: CorporateAccount;
  onSaved: (account: CorporateAccount) => void;
}) {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<User | null>(null);
  const [linking, setLinking] = useState(false);
  const [roleOpenFor, setRoleOpenFor] = useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<User | null>(null);

  const primaryId = account.primaryContactUserId;
  const billingId = account.billingContactUserId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCorporateAccountMembers(account.id)
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          toast.error("Could not load members.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  async function persistContactRoles(patch: {
    primaryContactUserId?: string | null;
    billingContactUserId?: string | null;
  }) {
    const next: CorporateAccount = {
      ...account,
      ...patch,
      updatedAt: new Date()
    };
    await saveCorporateAccount(next);
    onSaved(next);
  }

  async function handleAddMember() {
    if (!memberToAdd) return;
    setLinking(true);
    try {
      await linkCustomerToCorporateAccount(memberToAdd.id, account.id);
      setMembers((current) => {
        if (current.some((m) => m.id === memberToAdd.id)) return current;
        return [...current, memberToAdd].sort((a, b) =>
          customerDisplayName(a).localeCompare(customerDisplayName(b))
        );
      });
      setMemberToAdd(null);
      setAddOpen(false);
      toast.success("Member linked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link member.");
    } finally {
      setLinking(false);
    }
  }

  function requestUnlink(user: User) {
    setRoleOpenFor(null);
    setPendingUnlink(user);
  }

  async function confirmUnlink(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingUnlink) return;
    const userId = pendingUnlink.id;
    if (userId === primaryId?.trim() || userId === billingId?.trim()) {
      toast.error("Clear this member as Primary or Billing contact before unlinking.");
      setPendingUnlink(null);
      return;
    }
    setBusy(true);
    try {
      await linkCustomerToCorporateAccount(userId, null);
      setMembers((current) => current.filter((m) => m.id !== userId));
      setPendingUnlink(null);
      toast.success("Member unlinked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlink member.");
    } finally {
      setBusy(false);
    }
  }

  async function setAsPrimary(userId: string) {
    setRoleOpenFor(null);
    setBusy(true);
    try {
      await persistContactRoles({ primaryContactUserId: userId });
      toast.success("Primary contact updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update contact role.");
    } finally {
      setBusy(false);
    }
  }

  async function setAsBilling(userId: string) {
    setRoleOpenFor(null);
    setBusy(true);
    try {
      await persistContactRoles({ billingContactUserId: userId });
      toast.success("Billing contact updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update contact role.");
    } finally {
      setBusy(false);
    }
  }

  async function clearContactRoles(userId: string) {
    setRoleOpenFor(null);
    const patch: {
      primaryContactUserId?: string | null;
      billingContactUserId?: string | null;
    } = {};
    if (userId === primaryId?.trim()) patch.primaryContactUserId = null;
    if (userId === billingId?.trim()) patch.billingContactUserId = null;
    if (Object.keys(patch).length === 0) return;
    setBusy(true);
    try {
      await persistContactRoles(patch);
      toast.success("Contact role cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update contact role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Link customers to this account for booking and contacts.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add member
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-10 text-center">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">No members linked yet.</p>
          ) : (
            <div className="divide-y">
              {members.map((member) => {
                const isPrimary = member.id === primaryId?.trim();
                const isBilling = member.id === billingId?.trim();
                const roleLabel = contactRoleLabel(member.id, primaryId, billingId);
                const displayName = customerDisplayName(member);

                return (
                  <div
                    key={member.id}
                    className="flex min-w-0 items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage src={member.profile.photoURL ?? undefined} />
                        <AvatarFallback>
                          {generateAvatarFallback(displayName || member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        <p className="text-muted-foreground truncate text-sm">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Popover
                        open={roleOpenFor === member.id}
                        onOpenChange={(isOpen) => setRoleOpenFor(isOpen ? member.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            className="w-40 justify-between font-normal">
                            {roleLabel}
                            <ChevronDownIcon className="text-muted-foreground size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="end">
                          <Command>
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => void clearContactRoles(member.id)}
                                  className="items-start px-4 py-2">
                                  <div>
                                    <p>Member</p>
                                    <p className="text-muted-foreground text-sm">
                                      Linked to this account only.
                                    </p>
                                  </div>
                                  {!isPrimary && !isBilling ? (
                                    <CheckIcon className="text-primary ml-auto size-4" />
                                  ) : null}
                                </CommandItem>
                                <CommandItem
                                  onSelect={() => void setAsPrimary(member.id)}
                                  className="items-start px-4 py-2">
                                  <div>
                                    <p>Primary</p>
                                    <p className="text-muted-foreground text-sm">
                                      Main contact for the company.
                                    </p>
                                  </div>
                                  {isPrimary ? (
                                    <CheckIcon className="text-primary ml-auto size-4" />
                                  ) : null}
                                </CommandItem>
                                <CommandItem
                                  onSelect={() => void setAsBilling(member.id)}
                                  className="items-start px-4 py-2">
                                  <div>
                                    <p>Billing</p>
                                    <p className="text-muted-foreground text-sm">
                                      Receives invoices for this account.
                                    </p>
                                  </div>
                                  {isBilling ? (
                                    <CheckIcon className="text-primary ml-auto size-4" />
                                  ) : null}
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={busy}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isPrimary || isBilling || busy}
                            onClick={() => requestUnlink(member)}>
                            <Unlink className="size-4" />
                            {isPrimary || isBilling
                              ? "Clear Primary/Billing first"
                              : "Unlink"}
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
        open={pendingUnlink !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingUnlink(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              {pendingUnlink ? customerDisplayName(pendingUnlink) : "this member"} from
              this account. They will no longer book under corporate rates for this
              account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(e) => void confirmUnlink(e)}>
              {busy ? "Unlinking…" : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setMemberToAdd(null);
        }}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add member</SheetTitle>
            <SheetDescription>
              Link an existing customer to this corporate account.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="account-add-member">Customer</Label>
              <CustomerAutocomplete
                id="account-add-member"
                value={memberToAdd}
                onChange={setMemberToAdd}
                placeholder="Search customers…"
                disabled={linking}
              />
            </div>
            <SheetFooter className="px-0">
              <Button
                type="button"
                disabled={!memberToAdd || linking}
                onClick={() => void handleAddMember()}>
                {linking ? "Linking…" : "Link member"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
