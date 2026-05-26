"use client";

import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { vehicleTierLabel } from "@/lib/prochauffeur/pricingHelpers";
import type {
  PricingAddon,
  PricingConfig,
  PricingVehicleTier,
} from "@/lib/prochauffeur/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function PricingConfigView() {
  const router = useRouter();
  const {
    pricingConfig,
    hasPricingDocument,
    hasReceivedOperationsSnapshot,
    savePricing,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const [config, setConfig] = useState<PricingConfig>(pricingConfig);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(pricingConfig);
  }, [pricingConfig]);

  function updateRate<K extends keyof PricingConfig>(
    key: K,
    value: PricingConfig[K]
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function updateVehicleTier(
    type: PricingVehicleTier["type"],
    patch: Partial<PricingVehicleTier>
  ) {
    setConfig((current) => ({
      ...current,
      vehicles: current.vehicles.map((tier) =>
        tier.type === type ? { ...tier, ...patch } : tier
      ),
    }));
  }

  function updateAddon(index: number, patch: Partial<PricingAddon>) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.map((addon, i) =>
        i === index ? { ...addon, ...patch } : addon
      ),
    }));
  }

  function addAddon() {
    setConfig((current) => ({
      ...current,
      addons: [
        ...current.addons,
        {
          id: `addon_${crypto.randomUUID().slice(0, 8)}`,
          title: "",
          price: 0,
        },
      ],
    }));
  }

  function removeAddon(index: number) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (config.addons.some((addon) => !addon.id.trim() || !addon.title.trim())) {
      setLocalError("Each add-on needs an id and title.");
      return;
    }
    setLocalError(null);
    const ok = await savePricing(config);
    if (ok) router.push("/company");
  }

  return (
    <CompanySettingsPage
      title="Pricing"
      description="Configure fares, vehicle tiers, and add-ons for quotes and bookings."
    >
      {!hasReceivedOperationsSnapshot ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading pricing…
        </p>
      ) : (
        <>
          {!hasPricingDocument ? (
            <div className="mb-4 rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-sm text-warning-600 dark:text-warning-400">
              No pricing document in Firestore yet. The form shows built-in
              defaults — save to create app_settings/pricing.
            </div>
          ) : null}

          {(actionError || localError) && (
            <AdminActionBanner
              message={localError ?? actionError ?? ""}
              onDismiss={() => {
                setLocalError(null);
                clearActionError();
              }}
            />
          )}

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
              <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Base rates
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField
                  label="Minimum fare"
                  value={config.minimumFare}
                  onChange={(v) => updateRate("minimumFare", v)}
                />
                <NumberField
                  label="Base fare"
                  value={config.baseFare}
                  onChange={(v) => updateRate("baseFare", v)}
                />
                <NumberField
                  label="Distance rate ($/km)"
                  value={config.distanceRatePerKm}
                  onChange={(v) => updateRate("distanceRatePerKm", v)}
                  step={0.01}
                />
                <NumberField
                  label="Time rate ($/hour)"
                  value={config.timeRatePerHour}
                  onChange={(v) => updateRate("timeRatePerHour", v)}
                  step={0.01}
                />
                <NumberField
                  label="Waiting fee (flat)"
                  value={config.waitingFeeFlat}
                  onChange={(v) => updateRate("waitingFeeFlat", v)}
                  step={0.01}
                />
                <NumberField
                  label="Peak / weekend multiplier"
                  value={config.peakOrWeekendMultiplier}
                  onChange={(v) => updateRate("peakOrWeekendMultiplier", v)}
                  step={0.01}
                />
                <NumberField
                  label="Return-to-base fee"
                  value={config.returnToBaseFee}
                  onChange={(v) => updateRate("returnToBaseFee", v)}
                  step={0.01}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
              <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Vehicle tiers
              </h4>
              <div className="space-y-4">
                {config.vehicles.map((tier) => (
                  <div
                    key={tier.type}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <h3 className="font-medium text-gray-800 dark:text-white/90">
                      {vehicleTierLabel(tier.type)}
                    </h3>
                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                      <NumberField
                        label="Multiplier"
                        value={tier.multiplier}
                        onChange={(v) =>
                          updateVehicleTier(tier.type, { multiplier: v })
                        }
                        step={0.01}
                      />
                      <NumberField
                        label="Minimum booked hours"
                        value={tier.minimumBookedHours}
                        onChange={(v) =>
                          updateVehicleTier(tier.type, {
                            minimumBookedHours: Math.max(1, Math.trunc(v)),
                          })
                        }
                        step={1}
                      />
                      <NumberField
                        label="Display hourly from"
                        value={tier.displayHourlyFrom ?? 0}
                        onChange={(v) =>
                          updateVehicleTier(tier.type, {
                            displayHourlyFrom: v > 0 ? v : null,
                          })
                        }
                        step={0.01}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Add-ons
                </h4>
                <Button size="sm" variant="outline" onClick={addAddon}>
                  Add add-on
                </Button>
              </div>
              <div className="space-y-4">
                {config.addons.map((addon, index) => (
                  <div
                    key={`${addon.id}-${index}`}
                    className="grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-[1fr_1fr_120px_auto] dark:border-gray-700"
                  >
                    <div>
                      <Label>Id</Label>
                      <Input
                        value={addon.id}
                        onChange={(e) =>
                          updateAddon(index, { id: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={addon.title}
                        onChange={(e) =>
                          updateAddon(index, { title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step={0.01}
                        value={addon.price}
                        onChange={(e) =>
                          updateAddon(index, {
                            price: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeAddon(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex gap-3">
              <Button disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving…" : "Save pricing"}
              </Button>
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={() => router.push("/company")}
              >
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
    </CompanySettingsPage>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
