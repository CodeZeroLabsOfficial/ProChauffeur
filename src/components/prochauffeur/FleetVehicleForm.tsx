"use client";

import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import SectionedFormModal, {
  FormSection,
  type SectionNavItem,
} from "@/components/prochauffeur/SectionedFormModal";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import {
  createEmptyVehicle,
  prepareVehicleForSave,
} from "@/lib/prochauffeur/vehicleHelpers";
import type { Vehicle, VehicleType } from "@/lib/prochauffeur/types";
import { VEHICLE_TYPE_LABELS } from "@/lib/prochauffeur/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

const vehicleTypes = Object.entries(VEHICLE_TYPE_LABELS) as [
  VehicleType,
  string,
][];

const VEHICLE_FORM_SECTIONS: SectionNavItem[] = [
  { id: "vehicle-details", label: "Vehicle details" },
  { id: "capacity", label: "Capacity" },
  { id: "amenities", label: "Amenities & class" },
];

type FleetVehicleFormProps = {
  vehicleId?: string;
  variant?: "page" | "modal";
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function FleetVehicleForm({
  vehicleId,
  variant = "page",
  isOpen = false,
  onClose,
  onSuccess,
  onCancel,
}: FleetVehicleFormProps) {
  const router = useRouter();
  const isModal = variant === "modal";
  const scrollToSectionRef = useRef<(id: string) => void>(() => {});
  const { vehicles, saveVehicle, isSaving, actionError, clearActionError } =
    useAdminOperations();
  const isNew = !vehicleId;

  const [vehicle, setVehicle] = useState<Vehicle>(() =>
    createEmptyVehicle(crypto.randomUUID())
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    const existing = vehicles.find((v) => v.driverID === vehicleId);
    if (existing) setVehicle(existing);
  }, [vehicleId, vehicles]);

  function updateField<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setVehicle((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const m = vehicle.make.trim();
    const mo = vehicle.model.trim();
    const c = vehicle.color.trim();
    const p = vehicle.licensePlate.trim();
    const wifi = vehicle.wifiServiceDescription.trim();
    const serviceClass = vehicle.serviceClassDescription.trim();

    if (!m || !mo || !c || !p) {
      setLocalError("Enter make, model, color, and license plate.");
      if (isModal) scrollToSectionRef.current("vehicle-details");
      return;
    }
    if (!wifi || !serviceClass) {
      setLocalError("Enter wifi and class descriptions.");
      if (isModal) scrollToSectionRef.current("amenities");
      return;
    }

    setLocalError(null);
    const payload = prepareVehicleForSave({
      ...vehicle,
      make: m,
      model: mo,
      color: c,
      licensePlate: p,
      passengerCapacity: Math.max(1, vehicle.passengerCapacity),
      wifiServiceDescription: wifi,
      serviceClassDescription: serviceClass,
    });

    const ok = await saveVehicle(payload);
    if (!ok) return;
    if (onSuccess) {
      onSuccess();
      return;
    }
    router.push("/fleet");
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/fleet");
  }

  const errorBanner =
    actionError || localError ? (
      <AdminActionBanner
        message={localError ?? actionError ?? ""}
        onDismiss={() => {
          setLocalError(null);
          clearActionError();
        }}
      />
    ) : null;

  const vehicleDetailsSection = (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Make"
          value={vehicle.make}
          onChange={(v) => updateField("make", v)}
        />
        <Field
          label="Model"
          value={vehicle.model}
          onChange={(v) => updateField("model", v)}
        />
        <Field
          label="Color"
          value={vehicle.color}
          onChange={(v) => updateField("color", v)}
        />
        <Field
          label="License plate"
          value={vehicle.licensePlate}
          onChange={(v) => updateField("licensePlate", v)}
        />
      </div>

      <div>
        <Label>Pricing vehicle type</Label>
        <select
          className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          value={vehicle.pricingVehicleType}
          onChange={(e) =>
            updateField("pricingVehicleType", e.target.value as VehicleType)
          }
        >
          {vehicleTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const capacitySection = (
    <div className="grid gap-5 md:grid-cols-3">
      <NumberField
        label="Passengers"
        value={vehicle.passengerCapacity}
        onChange={(v) => updateField("passengerCapacity", v)}
      />
      <NumberField
        label="Small luggage"
        value={vehicle.fleetSmallLuggageCount}
        onChange={(v) => updateField("fleetSmallLuggageCount", v)}
      />
      <NumberField
        label="Large luggage"
        value={vehicle.fleetLargeLuggageCount}
        onChange={(v) => updateField("fleetLargeLuggageCount", v)}
      />
    </div>
  );

  const amenitiesSection = (
    <>
      <Field
        label="Wi‑Fi description"
        value={vehicle.wifiServiceDescription}
        onChange={(v) => updateField("wifiServiceDescription", v)}
      />
      <Field
        label="Service class"
        value={vehicle.serviceClassDescription}
        onChange={(v) => updateField("serviceClassDescription", v)}
      />
      <Field
        label="Interior"
        value={vehicle.interiorDescription}
        onChange={(v) => updateField("interiorDescription", v)}
      />
      <Field
        label="Climate control"
        value={vehicle.climateControlDescription}
        onChange={(v) => updateField("climateControlDescription", v)}
      />
      <Field
        label="Gear type"
        value={vehicle.gearTypeDescription}
        onChange={(v) => updateField("gearTypeDescription", v)}
      />
    </>
  );

  const footerActions = (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={isSaving}
        onClick={handleCancel}
      >
        Cancel
      </Button>
      <Button size="sm" disabled={isSaving} onClick={handleSave}>
        {isSaving ? "Saving…" : "Save vehicle"}
      </Button>
    </>
  );

  if (isModal) {
    return (
      <SectionedFormModal
        isOpen={isOpen}
        onClose={onClose ?? handleCancel}
        title={isNew ? "Add vehicle" : "Edit vehicle"}
        sections={VEHICLE_FORM_SECTIONS}
        headerExtra={errorBanner}
        footer={footerActions}
        scrollToSectionRef={scrollToSectionRef}
      >
        <FormSection id="vehicle-details" title="Vehicle details">
          {vehicleDetailsSection}
        </FormSection>
        <FormSection id="capacity" title="Capacity">
          {capacitySection}
        </FormSection>
        <FormSection id="amenities" title="Amenities & class">
          {amenitiesSection}
        </FormSection>
      </SectionedFormModal>
    );
  }

  const formBody = (
    <>
      {errorBanner}

      <div className="max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {vehicleDetailsSection}
        {capacitySection}
        {amenitiesSection}

        <div className="flex items-center justify-end gap-3 pt-2">
          {footerActions}
        </div>
      </div>
    </>
  );

  return (
    <div>
      <PageBreadcrumb pageTitle={isNew ? "Add vehicle" : "Edit vehicle"} />
      {formBody}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
