"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/models";
import {
  fetchCorporateAccountMembers,
  linkCustomerToCorporateAccount
} from "@/lib/services/firebase-service";
import { customerDisplayName } from "@/lib/users/customer-display";

export function AccountMembersTab({ accountId }: { accountId: string }) {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToAdd, setMemberToAdd] = useState<User | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCorporateAccountMembers(accountId)
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
  }, [accountId]);

  async function handleAddMember() {
    if (!memberToAdd) return;
    setLinking(true);
    try {
      await linkCustomerToCorporateAccount(memberToAdd.id, accountId);
      setMembers((current) => {
        if (current.some((m) => m.id === memberToAdd.id)) return current;
        return [...current, memberToAdd].sort((a, b) =>
          customerDisplayName(a).localeCompare(customerDisplayName(b))
        );
      });
      setMemberToAdd(null);
      toast.success("Member linked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link member.");
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkMember(userId: string) {
    setLinking(true);
    try {
      await linkCustomerToCorporateAccount(userId, null);
      setMembers((current) => current.filter((m) => m.id !== userId));
      toast.success("Member unlinked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlink member.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members linked.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{customerDisplayName(member)}</p>
                  <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  disabled={linking}
                  onClick={() => void handleUnlinkMember(member.id)}>
                  Unlink
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 *:not-first:mt-2">
            <Label htmlFor="account-add-member">Add member</Label>
            <CustomerAutocomplete
              id="account-add-member"
              value={memberToAdd}
              onChange={setMemberToAdd}
              placeholder="Search customers…"
              disabled={linking}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!memberToAdd || linking}
            onClick={() => void handleAddMember()}>
            {linking ? "Linking…" : "Link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
