"use client";

import CompanyProfileEditButton from "@/components/company-profile/CompanyProfileEditButton";
import FormModal from "@/components/prochauffeur/FormModal";
import {
  ModalFormDescription,
  ModalFormFooterActions,
} from "@/components/prochauffeur/modalShell";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import { updateUserProfile } from "@/lib/prochauffeur/firestore";
import React, { useEffect, useState } from "react";

export default function UserAddressCard() {
  const { appUser, refreshAppUser } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStreet(appUser?.profile.address?.street ?? "");
    setCity(appUser?.profile.address?.city ?? "");
    setState(appUser?.profile.address?.state ?? "");
    setPostcode(appUser?.profile.address?.postcode ?? "");
    setCountry(appUser?.profile.address?.country ?? "");
    setSaveError(null);
  }, [isOpen, appUser]);

  async function handleSave() {
    if (!appUser) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateUserProfile(appUser.id, {
        ...appUser.profile,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postcode: postcode.trim(),
          country: country.trim(),
        },
      });
      await refreshAppUser();
      closeModal();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not update address."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const displayStreet = appUser?.profile.address?.street?.trim() || "—";
  const displayCity = appUser?.profile.address?.city?.trim() || "—";
  const displayState = appUser?.profile.address?.state?.trim() || "—";
  const displayPostcode = appUser?.profile.address?.postcode?.trim() || "—";
  const displayCountry = appUser?.profile.address?.country?.trim() || "—";

  return (
    <>
      <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Address
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Street
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {displayStreet}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  City
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {displayCity}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  State
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {displayState}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Postcode
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {displayPostcode}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Country
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {displayCountry}
                </p>
              </div>
            </div>
          </div>

          <div className="self-end lg:self-auto">
            <CompanyProfileEditButton onClick={openModal} />
          </div>
        </div>
      </div>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Edit address"
        footer={
          <ModalFormFooterActions>
            <Button size="sm" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </ModalFormFooterActions>
        }
      >
        <ModalFormDescription>
          Update your details to keep your profile up-to-date.
        </ModalFormDescription>
        {saveError ? (
          <p className="mb-4 text-sm text-error-500">{saveError}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <div>
            <Label>Street</Label>
            <Input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div>
            <Label>City</Label>
            <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div>
            <Label>State</Label>
            <Input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          <div>
            <Label>Postcode</Label>
            <Input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>

          <div>
            <Label>Country</Label>
            <Input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
      </FormModal>
    </>
  );
}
