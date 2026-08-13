"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, InfoIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { useFileUpload } from "@/hooks/use-file-upload";
import { saveVehicleClass, uploadVehicleClassImage } from "@/lib/services/firebase-service";
import {
  buildInitialVehicleClass,
  slugFromDisplayName,
  tripTypeTitle,
  VEHICLE_CLASS_BODY_TYPES,
  VEHICLE_CLASS_SERVICE_TIERS,
  type TripType,
  type VehicleClass,
  type VehicleClassInclusion
} from "@/lib/models";
import { MultiSelectField } from "@/components/multi-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ProfileV2TabTrigger,
  profileV2TabsListClassName
} from "@/components/layout/profile-tab-bar";
import { NumberStepper } from "@/components/number-stepper";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function SectionHeading({ children }: { children: string }) {
  return <h4 className="text-sm font-medium">{children}</h4>;
}

function FieldInfoTooltip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent rounded-full p-1"
          aria-label={`About ${label}`}>
          <InfoIcon className="text-muted-foreground size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function newInclusion(): VehicleClassInclusion {
  return { id: crypto.randomUUID(), label: "", value: "" };
}

function SortableInclusionRow({
  inclusion,
  onChange,
  onRemove
}: {
  inclusion: VehicleClassInclusion;
  onChange: (patch: Partial<Pick<VehicleClassInclusion, "label" | "value">>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: inclusion.id
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn("flex items-center gap-2", isDragging && "opacity-60")}>
      <button
        type="button"
        className="text-muted-foreground hover:bg-accent inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
        aria-label="Reorder inclusion"
        {...attributes}
        {...listeners}>
        <GripVerticalIcon className="size-4" />
      </button>
      <Input
        value={inclusion.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Name"
        aria-label="Inclusion name"
      />
      <Input
        value={inclusion.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="Detail"
        aria-label="Inclusion detail"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove inclusion">
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
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
  tooltip: string;
  step?: number;
  decimals?: number;
  min?: number;
  max?: number;
};

const transferFields: RateNumberField[] = [
  {
    key: "minimumBaseRate",
    label: "Min. base rate",
    tooltip:
      "Lowest transfer fare for this class. If the calculated fare is lower, the quote is raised to this amount."
  },
  {
    key: "baseFare",
    label: "Base fare",
    tooltip: "Flat amount added to every transfer before distance and fees."
  },
  {
    key: "deadheadRatePerUnit",
    label: "Deadhead rate",
    step: 0.01,
    decimals: 2,
    tooltip: "Rate per distance unit for empty travel to pickup and from drop-off."
  },
  {
    key: "tripRatePerUnit",
    label: "Trip rate",
    step: 0.01,
    decimals: 2,
    tooltip: "Rate per distance unit while the customer is onboard."
  },
  {
    key: "returnToBaseFee",
    label: "Return-to-base",
    tooltip: "Flat fee added to every transfer for returning to base."
  },
  {
    key: "waitingFeeFlat",
    label: "Waiting fee",
    tooltip: "Stored on the class but not used in quotes today."
  }
];

const hourlyFields: RateNumberField[] = [
  {
    key: "weekdayHourlyRate",
    label: "Weekday hourly",
    tooltip: "Hourly rate charged on weekdays."
  },
  {
    key: "weekendHourlyRate",
    label: "Weekend hourly",
    tooltip: "Hourly rate charged on weekend days."
  },
  {
    key: "weekdayMinimumHours",
    label: "Weekday min. hrs",
    step: 0.5,
    decimals: 1,
    tooltip: "Minimum billable hours on weekdays, even if the booking is shorter."
  },
  {
    key: "weekendMinimumHours",
    label: "Weekend min. hrs",
    step: 0.5,
    decimals: 1,
    tooltip: "Minimum billable hours on weekend days, even if the booking is shorter."
  },
  {
    key: "freeDeadheadMinutes",
    label: "Free deadhead",
    tooltip: "Deadhead minutes included before extra deadhead time is charged."
  },
  {
    key: "deadheadRatePerMinute",
    label: "Deadhead / min",
    step: 0.01,
    decimals: 2,
    tooltip: "Rate charged per minute of deadhead after free deadhead is used."
  },
  {
    key: "displayHourlyFrom",
    label: "Display from",
    tooltip: "“From” hourly price shown to customers when browsing this class."
  }
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

  const inclusionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sheetKey = vehicleClass?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    setDraft(
      vehicleClass
        ? buildInitialVehicleClass({
            ...vehicleClass,
            id: vehicleClass.id,
            displayName: vehicleClass.displayName
          })
        : buildInitialVehicleClass({
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

  function updateInclusion(
    id: string,
    patch: Partial<Pick<VehicleClassInclusion, "label" | "value">>
  ) {
    setDraft((current) => ({
      ...current,
      inclusions: current.inclusions.map((row) => (row.id === id ? { ...row, ...patch } : row))
    }));
  }

  function removeInclusion(id: string) {
    setDraft((current) => ({
      ...current,
      inclusions: current.inclusions.filter((row) => row.id !== id)
    }));
  }

  function addInclusion() {
    setDraft((current) => ({
      ...current,
      inclusions: [...current.inclusions, newInclusion()]
    }));
  }

  function onInclusionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((current) => {
      const oldIndex = current.inclusions.findIndex((row) => row.id === active.id);
      const newIndex = current.inclusions.findIndex((row) => row.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return { ...current, inclusions: arrayMove(current.inclusions, oldIndex, newIndex) };
    });
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
      const incompleteInclusion = draft.inclusions.find(
        (row) => !row.label.trim() || !row.value.trim()
      );
      if (incompleteInclusion) {
        toast.error("Each inclusion needs both a name and a detail.");
        return;
      }
      const inclusions = draft.inclusions.map((row) => ({
        id: row.id,
        label: row.label.trim(),
        value: row.value.trim()
      }));
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
      await saveVehicleClass({
        ...draft,
        slug,
        inclusions,
        imageUrl: nextImageUrl,
        updatedAt: new Date()
      });
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
        <form className="space-y-4 px-4" onSubmit={onSubmit}>
          <TooltipProvider>
            <Tabs key={sheetKey} defaultValue="overview" className="gap-4">
              <TabsList className={`${profileV2TabsListClassName} w-full justify-start`}>
                <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
                <ProfileV2TabTrigger value="inclusions">Inclusions</ProfileV2TabTrigger>
                <ProfileV2TabTrigger value="pricing">Pricing</ProfileV2TabTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <SectionHeading>Class details</SectionHeading>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="displayName">Display name</Label>
                        <FieldInfoTooltip label="display name">
                          Customer-facing name for this class in booking and quotes.
                        </FieldInfoTooltip>
                      </div>
                      <Input
                        id="displayName"
                        value={draft.displayName}
                        onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="supportedTripTypes">Supported trips</Label>
                        <FieldInfoTooltip label="supported trips">
                          Which trip types customers can book with this class.
                        </FieldInfoTooltip>
                      </div>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="serviceTier">Service tier</Label>
                        <FieldInfoTooltip label="service tier">
                          Customers see this as the Class option when choosing a vehicle.
                        </FieldInfoTooltip>
                      </div>
                      <Select
                        value={draft.serviceTier}
                        onValueChange={(value) => setDraft((c) => ({ ...c, serviceTier: value }))}>
                        <SelectTrigger id="serviceTier" className="w-full">
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                          {VEHICLE_CLASS_SERVICE_TIERS.map((tier) => (
                            <SelectItem key={tier} value={tier}>
                              {tier}
                            </SelectItem>
                          ))}
                          {!VEHICLE_CLASS_SERVICE_TIERS.includes(
                            draft.serviceTier as (typeof VEHICLE_CLASS_SERVICE_TIERS)[number]
                          ) && draft.serviceTier ? (
                            <SelectItem value={draft.serviceTier}>{draft.serviceTier}</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="bodyType">Body type</Label>
                        <FieldInfoTooltip label="body type">
                          Customers see this as the Body option when choosing a vehicle.
                        </FieldInfoTooltip>
                      </div>
                      <Select
                        value={draft.bodyType}
                        onValueChange={(value) => setDraft((c) => ({ ...c, bodyType: value }))}>
                        <SelectTrigger id="bodyType" className="w-full">
                          <SelectValue placeholder="Select body" />
                        </SelectTrigger>
                        <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                          {VEHICLE_CLASS_BODY_TYPES.map((body) => (
                            <SelectItem key={body} value={body}>
                              {body}
                            </SelectItem>
                          ))}
                          {!VEHICLE_CLASS_BODY_TYPES.includes(
                            draft.bodyType as (typeof VEHICLE_CLASS_BODY_TYPES)[number]
                          ) && draft.bodyType ? (
                            <SelectItem value={draft.bodyType}>{draft.bodyType}</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    <SectionHeading>Capacity</SectionHeading>
                    <FieldInfoTooltip label="capacity">
                      Maximum passengers and luggage customers can book with this class.
                    </FieldInfoTooltip>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <NumberStepper
                      id="passengerCapacity"
                      label="Passengers"
                      value={draft.capacity.passengerCount}
                      onChange={(value) =>
                        setDraft((c) => ({
                          ...c,
                          capacity: {
                            ...c.capacity,
                            passengerCount: value
                          }
                        }))
                      }
                      min={1}
                      max={60}
                    />
                    <NumberStepper
                      id="smallLuggageCount"
                      label="Small luggage"
                      value={draft.capacity.luggage.smallCount}
                      onChange={(value) =>
                        setDraft((c) => ({
                          ...c,
                          capacity: {
                            ...c.capacity,
                            luggage: { ...c.capacity.luggage, smallCount: value }
                          }
                        }))
                      }
                      min={0}
                      max={20}
                    />
                    <NumberStepper
                      id="largeLuggageCount"
                      label="Large luggage"
                      value={draft.capacity.luggage.largeCount}
                      onChange={(value) =>
                        setDraft((c) => ({
                          ...c,
                          capacity: {
                            ...c.capacity,
                            luggage: { ...c.capacity.luggage, largeCount: value }
                          }
                        }))
                      }
                      min={0}
                      max={20}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    <SectionHeading>Vehicle class image</SectionHeading>
                    <FieldInfoTooltip label="vehicle class image">
                      Shown in the customer app vehicle picker and booking flow. PNG, JPEG, or WebP
                      up to 5 MB.
                    </FieldInfoTooltip>
                  </div>
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
                        onCheckedChange={(checked) =>
                          setDraft((c) => ({ ...c, isEnabled: checked }))
                        }
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="vc-visible">Visible</Label>
                        <p className="text-muted-foreground text-xs">
                          When off, this class is hidden from the customer booking flow.
                        </p>
                      </div>
                      <Switch
                        id="vc-visible"
                        checked={draft.isVisible}
                        onCheckedChange={(checked) =>
                          setDraft((c) => ({ ...c, isVisible: checked }))
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inclusions" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    <SectionHeading>Inclusions</SectionHeading>
                    <FieldInfoTooltip label="inclusions">
                      Customers see these under “What’s included” when booking this class.
                    </FieldInfoTooltip>
                  </div>
                  <DndContext
                    sensors={inclusionSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onInclusionDragEnd}>
                    <SortableContext
                      items={draft.inclusions.map((row) => row.id)}
                      strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {draft.inclusions.map((inclusion) => (
                          <SortableInclusionRow
                            key={inclusion.id}
                            inclusion={inclusion}
                            onChange={(patch) => updateInclusion(inclusion.id, patch)}
                            onRemove={() => removeInclusion(inclusion.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <Button type="button" variant="outline" size="sm" onClick={addInclusion}>
                    <PlusIcon /> Add inclusion
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    <SectionHeading>Point-to-point rates</SectionHeading>
                    <FieldInfoTooltip label="point-to-point rates">
                      Used for transfer trips. Distance and deadhead are billed from these rates,
                      then floored by the min base rate.
                    </FieldInfoTooltip>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {transferFields.map((field) => (
                      <NumberStepper
                        key={field.key}
                        id={`transfer-${field.key}`}
                        label={field.label}
                        labelExtra={
                          <FieldInfoTooltip label={field.label.toLowerCase()}>
                            {field.tooltip}
                          </FieldInfoTooltip>
                        }
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
                  <div className="flex items-center gap-1">
                    <SectionHeading>Hourly rates</SectionHeading>
                    <FieldInfoTooltip label="hourly rates">
                      Used for hourly / as-directed trips. Customers are billed the higher of booked
                      hours or the minimum hours.
                    </FieldInfoTooltip>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {hourlyFields.map((field) => (
                      <NumberStepper
                        key={field.key}
                        id={`hourly-${field.key}`}
                        label={field.label}
                        labelExtra={
                          <FieldInfoTooltip label={field.label.toLowerCase()}>
                            {field.tooltip}
                          </FieldInfoTooltip>
                        }
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
          </TooltipProvider>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
