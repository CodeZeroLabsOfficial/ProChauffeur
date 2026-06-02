"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { CircleUserRoundIcon, Trash2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { useFileUpload } from "@/hooks/use-file-upload";
import { fetchUser, updateUserProfile, uploadUserProfilePhoto } from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const profileFormSchema = z.object({
  username: z.string().email({ message: "Enter a valid email address." }),
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  phoneNumber: z.string(),
  address: z.string(),
  dateOfBirth: z.date({ required_error: "Date of birth is required." })
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function ProfileSettingsPage() {
  const { user: authUser } = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const [{ files }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
    accept: "image/*",
    onFilesAdded: () => setPhotoRemoved(false)
  });

  const previewUrl = files[0]?.preview ?? (photoRemoved ? null : photoURL);
  const fileName =
    files[0]?.file instanceof File ? files[0].file.name : previewUrl ? "Profile photo" : null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      address: ""
    }
  });

  useEffect(() => {
    let cancelled = false;

    fetchUser(authUser.uid)
      .then((user) => {
        if (cancelled || !user) return;

        const { firstName, lastName } =
          user.profile.firstName || user.profile.lastName
            ? {
                firstName: user.profile.firstName ?? "",
                lastName: user.profile.lastName ?? ""
              }
            : splitDisplayName(user.profile.displayName);

        setPhotoURL(user.profile.photoURL ?? null);
        setPhotoRemoved(false);
        form.reset({
          username: user.email,
          firstName,
          lastName,
          phoneNumber: user.profile.phoneNumber ?? "",
          address: user.profile.address ?? "",
          dateOfBirth: user.profile.dateOfBirth ?? undefined
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authUser.uid, form]);

  async function onSubmit(data: ProfileFormValues) {
    setSaving(true);
    try {
      let nextPhotoURL: string | null = photoRemoved ? null : photoURL;
      const uploadedFile = files[0]?.file;
      if (uploadedFile instanceof File) {
        nextPhotoURL = await uploadUserProfilePhoto(authUser.uid, uploadedFile);
      }

      await updateUserProfile(authUser.uid, {
        displayName: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber.trim() || null,
        address: data.address.trim() || null,
        dateOfBirth: data.dateOfBirth,
        photoURL: nextPhotoURL
      });
      setPhotoURL(nextPhotoURL);
      setPhotoRemoved(false);
      if (files[0]) removeFile(files[0].id);
      toast.success("Profile saved.");
    } catch {
      toast.error("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  function handleRemovePhoto() {
    if (files[0]) removeFile(files[0].id);
    setPhotoURL(null);
    setPhotoRemoved(true);
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 align-top">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={previewUrl ?? undefined} />
                  <AvatarFallback>
                    <CircleUserRoundIcon className="opacity-45" />
                  </AvatarFallback>
                </Avatar>
                <div className="relative flex gap-2">
                  <Button type="button" onClick={openFileDialog} aria-haspopup="dialog">
                    {fileName ? "Change image" : "Upload image"}
                  </Button>
                  <input
                    {...getInputProps()}
                    className="sr-only"
                    aria-label="Upload image file"
                    tabIndex={-1}
                  />
                  {fileName && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={handleRemovePhoto}>
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input type="email" readOnly {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input autoComplete="street-address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
                      align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        defaultMonth={field.value}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Update profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
