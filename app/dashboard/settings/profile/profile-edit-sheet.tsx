"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { CircleUserRoundIcon, Trash2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useFileUpload } from "@/hooks/use-file-upload";
import { updateUserProfile, uploadUserProfilePhoto } from "@/lib/services/firebase-service";
import type { User } from "@/lib/models";
import {
  isValidPostalAddress,
  postalAddressFromProfile,
  toProfilePostalFields,
  type PostalAddress
} from "@/lib/models/postal-address";
import {
  ProfileAddressField,
  PROFILE_ADDRESS_VALIDATION_MESSAGE
} from "@/components/profile-address-field";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

const profileFormSchema = z.object({
  username: z.string().email({ message: "Enter a valid email address." }),
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  phoneNumber: z.string(),
  dateOfBirth: z.date({ required_error: "Date of birth is required." })
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function profileFormValues(user: User): ProfileFormValues {
  const { firstName, lastName } =
    user.profile.firstName || user.profile.lastName
      ? {
          firstName: user.profile.firstName ?? "",
          lastName: user.profile.lastName ?? ""
        }
      : splitDisplayName(user.profile.displayName);

  return {
    username: user.email,
    firstName,
    lastName,
    phoneNumber: user.profile.phoneNumber ?? "",
    dateOfBirth: user.profile.dateOfBirth
  } as ProfileFormValues;
}

export function ProfileEditSheet({
  user,
  open,
  onOpenChange,
  onSaved
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: User) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<PostalAddress>(() => postalAddressFromProfile(user.profile));
  const [addressInvalid, setAddressInvalid] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(user.profile.photoURL ?? null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const [{ files }, { removeFile, openFileDialog, getInputProps, clearFiles }] = useFileUpload({
    accept: "image/*",
    onFilesAdded: () => setPhotoRemoved(false)
  });

  const previewUrl = files[0]?.preview ?? (photoRemoved ? null : photoURL);
  const fileName =
    files[0]?.file instanceof File ? files[0].file.name : previewUrl ? "Profile photo" : null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileFormValues(user)
  });

  useEffect(() => {
    if (!open) return;

    setPhotoURL(user.profile.photoURL ?? null);
    setPhotoRemoved(false);
    setAddress(postalAddressFromProfile(user.profile));
    setAddressInvalid(false);
    clearFiles();
    form.reset(profileFormValues(user));
  }, [open, user, form, clearFiles]);

  function handleRemovePhoto() {
    if (files[0]) removeFile(files[0].id);
    setPhotoURL(null);
    setPhotoRemoved(true);
  }

  async function onSubmit(data: ProfileFormValues) {
    if (!isValidPostalAddress(address)) {
      setAddressInvalid(true);
      toast.error(PROFILE_ADDRESS_VALIDATION_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      let nextPhotoURL: string | null = photoRemoved ? null : photoURL;
      const uploadedFile = files[0]?.file;
      if (uploadedFile instanceof File) {
        nextPhotoURL = await uploadUserProfilePhoto(user.id, uploadedFile);
      }

      const profile = {
        displayName: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber.trim() || null,
        ...toProfilePostalFields(address),
        dateOfBirth: data.dateOfBirth,
        photoURL: nextPhotoURL
      };

      await updateUserProfile(user.id, profile);
      onSaved({
        ...user,
        profile: { ...user.profile, ...profile }
      });
      toast.success("Profile saved.");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error("Profile save failed:", err);
      const message = err instanceof Error ? err.message : "Could not save profile.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Update your personal details and profile photo.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-4">
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
            <ProfileAddressField
              value={address}
              onChange={(next) => {
                setAddress(next);
                if (addressInvalid && isValidPostalAddress(next)) {
                  setAddressInvalid(false);
                }
              }}
              invalid={addressInvalid}
              disabled={saving}
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

            <SheetFooter className="px-0">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
