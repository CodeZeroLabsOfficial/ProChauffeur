"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { changePassword } from "@/lib/firebase/account-auth";
import { authErrorMessage } from "@/lib/firebase/auth-errors";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(1, { message: "Confirm your new password." })
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function ChangePasswordSheet({
  email,
  open,
  onOpenChange,
  passwordLoginAvailable
}: {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwordLoginAvailable: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  }, [open, form]);

  async function onSendResetEmail() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("No email address is available for this account.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth(), trimmed);
      toast.success("Password reset email sent. Complete the link, then sign in again.");
      onOpenChange(false);
    } catch (error) {
      console.error("Password reset failed:", error);
      toast.error(authErrorMessage(error));
    } finally {
      setResetting(false);
    }
  }

  async function onSubmit(data: PasswordFormValues) {
    setSaving(true);
    try {
      await changePassword(email, data.currentPassword, data.newPassword);
      toast.success("Password updated.");
      onOpenChange(false);
    } catch (error) {
      console.error("Password change failed:", error);
      toast.error(authErrorMessage(error, "Could not update password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Change password</SheetTitle>
          <SheetDescription>
            {passwordLoginAvailable
              ? "Enter your current password, then choose a new one."
              : "Password sign-in is not set up for this account. Send a reset email instead."}
          </SheetDescription>
        </SheetHeader>

        {passwordLoginAvailable ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SheetFooter className="px-0">
                <Button type="submit" disabled={saving || resetting}>
                  {saving ? "Updating…" : "Update password"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 px-4">
            <p className="text-muted-foreground text-sm">
              Use a password reset email to set or update your password, then sign in again.
            </p>
            <Button type="button" onClick={onSendResetEmail} disabled={resetting || saving}>
              {resetting ? "Sending…" : "Send password reset email"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
