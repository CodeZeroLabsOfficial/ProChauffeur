"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { createCustomer, updateUserEmail, updateUserProfile } from "@/lib/services/firebase-service";
import type { User } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export function CustomerEditSheet({
  user,
  open,
  onOpenChange,
  nested = false
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !user;
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    user?.profile.dateOfBirth ?? undefined
  );
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = user?.id ?? "__new__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setDateOfBirth(user?.profile.dateOfBirth ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const displayName = get("displayName");
    const email = get("email");
    const phoneNumber = get("phoneNumber") || undefined;
    const address = get("address") || undefined;

    if (!displayName) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const password = get("password");
        if (!email) {
          toast.error("Email is required.");
          return;
        }
        if (!password || password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        await createCustomer({
          email,
          password,
          displayName,
          phoneNumber,
          address,
          dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null
        });
        toast.success("Customer added.");
      } else {
        const profile = {
          ...user.profile,
          displayName,
          phoneNumber: phoneNumber || null,
          address: address || null,
          dateOfBirth: dateOfBirth ?? null
        };
        await updateUserProfile(user.id, profile);
        if (email && email !== user.email) {
          await updateUserEmail(user.id, email);
        }
        toast.success("Customer profile saved.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add customer" : "Edit customer"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Create a new customer account with email and password."
              : user?.email}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4" key={currentKey}>
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              name="displayName"
              required
              defaultValue={user?.profile.displayName ?? ""}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user?.email ?? ""}
              placeholder="email@example.com"
            />
          </div>

          {isNew ? (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={user?.profile.phoneNumber ?? ""}
              placeholder="Phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={user?.profile.address ?? ""}
              placeholder="Street address"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Date of birth</Label>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !dateOfBirth && "text-muted-foreground"
                  )}>
                  {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={cn(
                  "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                  nested && "z-[110]"
                )}
                align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                  selected={dateOfBirth}
                  onSelect={setDateOfBirth}
                  defaultMonth={dateOfBirth}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Add customer" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
