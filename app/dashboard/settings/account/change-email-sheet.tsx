"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { changeEmailAndSync } from "@/lib/firebase/account-auth";
import { authErrorMessage } from "@/lib/firebase/auth-errors";
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

const emailFormSchema = z.object({
  newEmail: z.string().email({ message: "Enter a valid email address." }),
  currentPassword: z.string().min(1, { message: "Current password is required." })
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export function ChangeEmailSheet({
  email,
  open,
  onOpenChange,
  onEmailChanged
}: {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmailChanged: (email: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      newEmail: email,
      currentPassword: ""
    }
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      newEmail: email,
      currentPassword: ""
    });
  }, [open, email, form]);

  async function onSubmit(data: EmailFormValues) {
    const trimmedEmail = data.newEmail.trim();
    if (trimmedEmail === email.trim()) {
      toast.error("Enter a different email address.");
      return;
    }

    setSaving(true);
    try {
      await changeEmailAndSync(email, data.currentPassword, trimmedEmail);
      onEmailChanged(trimmedEmail);
      toast.success("Email updated.");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Email change failed:", error);
      toast.error(authErrorMessage(error, "Could not update email."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Change email</SheetTitle>
          <SheetDescription>
            Update the email address you use to sign in. Your current password is required.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <SheetFooter className="px-0">
              <Button type="submit" disabled={saving}>
                {saving ? "Updating…" : "Update email"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
