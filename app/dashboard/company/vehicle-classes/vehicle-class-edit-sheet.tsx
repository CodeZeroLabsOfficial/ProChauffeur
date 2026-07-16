"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { useFileUpload } from "@/hooks/use-file-upload";
import { saveVehicleClass, uploadVehicleClassImage } from "@/lib/services/firebase-service";
import {
  buildInitialVehicleClass,
  slugFromDisplayName,
  tripTypeTitle,
  type TripType,
  type VehicleClass
} from "@/lib/models";
import { MultiSelectField } from "@/components/multi-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberStepper } from "@/components/number-stepper";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

function SectionHeading({ children }: { children: string }) {
  return <h4 className="text-sm font-medium">{children}</h4>;
}

function ImageUploadField({
  label,
  title,
  description,
  previewUrl,
  errors,
  onOpenDialog,
  inputProps,
  alt,
  hideLabel
}: {
  label: string;
  title: string;
  description: string;
  previewUrl: string | null;
  errors: string[];
  onOpenDialog: () => void;
  inputProps: React.InputHTMLAttributes<HTMLInputElement> & { ref: React.Ref<HTMLInputElement> };
  alt: string;
  hideLabel?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className={hideLabel ? "sr-only" : undefined}>{label}</Label>
      <Item
        variant="outline"
        className="cursor-pointer"
        onClick={onOpenDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDialog();
          }
        }}>
        <ItemMedia variant="image">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={alt}
              width={40}
              height={40}
              className="aspect-square size-10 rounded-sm object-cover"
              unoptimized={previewUrl.startsWith("blob:")}
            />
          ) : (
            <div className="bg-muted flex size-full items-center justify-center">
              <UploadIcon className="text-muted-foreground size-4" />
            </div>
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <UploadIcon className="text-muted-foreground size-4" />
        </ItemActions>
      </Item>
      <input {...inputProps} className="sr-only" aria-label={label} />
      {errors.length > 0 && <p className="text-destructive text-sm">{errors[0]}</p>}
    </div>
  );
}

type RateNumberField = {
  key: string;
  label: string;
  step?: number;
  decimals?: number;
  min?: number;
  max?: number;
};

const transferFields: RateNumberField[] = [
  { key: "minimumBaseRate", label: "Min. base rate" },
  { key: "baseFare", label: "Base fare" },
  { key: "deadheadRatePerUnit", label: "Deadhead rate", step: 0.01, decimals: 2 },
  { key: "tripRatePerUnit", label: "Trip rate", step: 0.01, decimals: 2 },
  { key: "returnToBaseFee", label: "Return-to-base" },
  { key: "waitingFeeFlat", label: "Waiting fee" }
];

const hourlyFields: RateNumberField[] = [
  { key: "weekdayHourlyRate", label: "Weekday hourly" },
  { key: "weekendHourlyRate", label: "Weekend hourly" },
  { key: "weekdayMinimumHours", label: "Weekday min. hrs", step: 0.5, decimals: 1 },
  { key: "weekendMinimumHours", label: "Weekend min. hrs", step: 0.5, decimals: 1 },
  { key: "freeDeadheadMinutes", label: "Free deadhead" },
  { key: "deadheadRatePerMinute", label: "Deadhead / min", step: 0.01, decimals: 2 },
  { key: "displayHourlyFrom", label: "Display from" }
];

const RATE_MIN = 0;
const RATE_MAX = 9999;

const SUPPORTED_TRIP_TYPE_OPTIONS = [
  { value: "transfer", label: tripTypeTitle.transfer },
  { value: "hourly", label: tripTypeTitle.hourly }
];

export function VehicleClassEditSheet({
  vehicleClass,
  sheetMode = "create",
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  vehicleClass: VehicleClass | null;
  sheetMode?: "create" | "edit" | "clone";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  nested?: boolean;
}) {
  const isNew = sheetMode !== "edit";
  const sheetTitle =
    sheetMode === "clone"
      ? "Clone vehicle class"
      : isNew
        ? "Add vehicle class"
        : "Edit vehicle class";
  const [draft, setDraft] = useState<VehicleClass>(() =>
    vehicleClass ??
      buildInitialVehicleClass({
        id: crypto.randomUUID(),
        displayName: ""
      })
  );
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");

  const [
    { files: imageFiles, errors: imageErrors },
    { openFileDialog: openImageDialog, getInputProps: getImageInputProps, clearFiles: clearImageFiles }
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/webp",
    maxSize: MAX_IMAGE_BYTES,
    maxFiles: 1
  });

  const sheetKey = vehicleClass?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    setDraft(
      vehicleClass ??
        buildInitialVehicleClass({
          id: crypto.randomUUID(),
          displayName: ""
        })
    );
  }

  useEffect(() => {
    clearImageFiles();
  }, [sheetKey, clearImageFiles]);

  const imagePreviewUrl = imageFiles[0]?.preview ?? draft.imageUrl ?? null;
  const hasImage = Boolean(imagePreviewUrl);

  function removeImage() {
    clearImageFiles();
    setDraft((current) => ({ ...current, imageUrl: null }));
  }

  function setTransferField(key: string, value: number) {
    setDraft((current) => ({
      ...current,
      transfer: { ...current.transfer, [key]: value }
    }));
  }

  function setHourlyField(key: string, value: number) {
    setDraft((current) => ({
      ...current,
      hourly: { ...current.hourly, [key]: value }
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const slug = slugFromDisplayName(draft.displayName);
      if (!slug) {
        toast.error("Display name must contain at least one letter or number.");
        return;
      }
      if (draft.supportedTripTypes.length === 0) {
        toast.error("Select at least one supported trip type.");
        return;
      }
      let nextImageUrl = draft.imageUrl ?? null;
      const pendingImage = imageFiles[0]?.file;
      if (pendingImage instanceof File) {
        try {
          nextImageUrl = await uploadVehicleClassImage(draft.id, pendingImage);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not upload vehicle class image.");
          return;
        }
      }
      await saveVehicleClass({ ...draft, slug, imageUrl: nextImageUrl, updatedAt: new Date() });
      toast.success(isNew ? "Vehicle class created." : "Vehicle class saved.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save vehicle class.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>
        <Separator />
        <form className="space-y-4 px-4" onSubmit={onSubmit}>
          <Tabs key={sheetKey} defaultValue="overview" className="gap-4">
            <TabsList
              className={cn(
                "-mb-0.5 h-auto w-full justify-start gap-4 border-none bg-transparent p-0"
              )}>
              <TabsTrigger value="overview" className={tabTriggerClassName}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="pricing" className={tabTriggerClassName}>
                Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="space-y-4">
                <SectionHeading>Class details</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      value={draft.displayName}
                      onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportedTripTypes">Supported trips</Label>
                    <MultiSelectField
                      id="supportedTripTypes"
                      options={SUPPORTED_TRIP_TYPE_OPTIONS}
                      selected={draft.supportedTripTypes.filter((t) => t !== "round_trip")}
                      onSelectedChange={(selected) =>
                        setDraft((c) => ({ ...c, supportedTripTypes: selected as TripType[] }))
                      }
                      placeholder="Select trip types"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Capacity</SectionHeading>
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumberStepper
                    id="passengerCapacity"
                    label="Passengers"
                    value={draft.passengerCapacity}
                    onChange={(value) => setDraft((c) => ({ ...c, passengerCapacity: value }))}
                    min={1}
                    max={60}
                  />
                  <NumberStepper
                    id="smallLuggageCount"
                    label="Small luggage"
                    value={draft.smallLuggageCount}
                    onChange={(value) => setDraft((c) => ({ ...c, smallLuggageCount: value }))}
                    min={0}
                    max={20}
                  />
                  <NumberStepper
                    id="largeLuggageCount"
                    label="Large luggage"
                    value={draft.largeLuggageCount}
                    onChange={(value) => setDraft((c) => ({ ...c, largeLuggageCount: value }))}
                    min={0}
                    max={20}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Vehicle class image</SectionHeading>
                <p className="text-muted-foreground text-sm">
                  Shown in the customer app vehicle picker and booking flow. PNG, JPEG, or WebP up to
                  5 MB.
                </p>
                <ImageUploadField
                  label="Vehicle class image"
                  hideLabel
                  title={hasImage ? "Replace image" : "Upload image"}
                  description={
                    hasImage ? "Tap to choose a different image" : "Tap to upload a hero image"
                  }
                  previewUrl={imagePreviewUrl}
                  errors={imageErrors}
                  onOpenDialog={openImageDialog}
                  inputProps={getImageInputProps()}
                  alt={draft.displayName || "Vehicle class"}
                />
                {hasImage ? (
                  <Button type="button" variant="outline" size="sm" onClick={removeImage}>
                    Remove image
                  </Button>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Booking</SectionHeading>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="vc-enabled">Enabled</Label>
                      <p className="text-muted-foreground text-xs">
                        Disabled classes are excluded from booking and quotes.
                      </p>
                    </div>
                    <Switch
                      id="vc-enabled"
                      checked={draft.isEnabled}
                      onCheckedChange={(checked) => setDraft((c) => ({ ...c, isEnabled: checked }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="vc-visible">Visible</Label>
                      <p className="text-muted-foreground text-xs">
                        When off, this class is hidden from the customer booking flow but remains
                        available to staff.
                      </p>
                    </div>
                    <Switch
                      id="vc-visible"
                      checked={draft.isVisible}
                      onCheckedChange={(checked) => setDraft((c) => ({ ...c, isVisible: checked }))}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-0 space-y-4">
              <div className="space-y-4">
                <SectionHeading>Point-to-point rates</SectionHeading>
                <div className="grid gap-3 sm:grid-cols-3">
                  {transferFields.map((field) => (
                    <NumberStepper
                      key={field.key}
                      id={`transfer-${field.key}`}
                      label={field.label}
                      value={draft.transfer[field.key as keyof typeof draft.transfer]}
                      onChange={(value) => setTransferField(field.key, value)}
                      min={field.min ?? RATE_MIN}
                      max={field.max ?? RATE_MAX}
                      step={field.step ?? 1}
                      decimals={field.decimals}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Hourly rates</SectionHeading>
                <div className="grid gap-3 sm:grid-cols-3">
                  {hourlyFields.map((field) => (
                    <NumberStepper
                      key={field.key}
                      id={`hourly-${field.key}`}
                      label={field.label}
                      value={draft.hourly[field.key as keyof typeof draft.hourly]}
                      onChange={(value) => setHourlyField(field.key, value)}
                      min={field.min ?? RATE_MIN}
                      max={field.max ?? RATE_MAX}
                      step={field.step ?? 1}
                      decimals={field.decimals}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
