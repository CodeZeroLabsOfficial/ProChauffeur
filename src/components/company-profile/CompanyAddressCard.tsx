"use client";

import SettingsEditableCard from "@/components/company-profile/SettingsEditableCard";
import {
  displayValue,
  trimmedCompanyProfile,
} from "@/components/company-profile/displayValue";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import FormModal from "@/components/prochauffeur/FormModal";
import {
  ModalFormDescription,
  ModalFormFooterActions,
} from "@/components/prochauffeur/modalShell";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import React, { useEffect, useState } from "react";

export default function CompanyAddressCard() {
  const { companyProfile, saveCompany, isSaving } = useAdminOperations();
  const { isOpen, openModal, closeModal } = useModal();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStreet(companyProfile.address.street);
    setCity(companyProfile.address.city);
    setState(companyProfile.address.state);
    setPostcode(companyProfile.address.postcode);
    setCountry(companyProfile.address.country);
  }, [isOpen, companyProfile.address]);

  async function handleSave() {
    const ok = await saveCompany(
      trimmedCompanyProfile({
        ...companyProfile,
        address: {
          street,
          city,
          state,
          postcode,
          country,
        },
      })
    );
    if (ok) closeModal();
  }

  return (
    <>
      <SettingsEditableCard onEdit={openModal} editAriaLabel="Edit company address">
        <h4 className="pe-10 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
          Company address
        </h4>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              Street
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {displayValue(companyProfile.address.street)}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              City
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {displayValue(companyProfile.address.city)}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              State
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {displayValue(companyProfile.address.state)}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              Postcode
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {displayValue(companyProfile.address.postcode)}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              Country
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {displayValue(companyProfile.address.country)}
            </p>
          </div>
        </div>
      </SettingsEditableCard>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Edit company address"
        footer={
          <ModalFormFooterActions>
            <Button
              size="sm"
              variant="outline"
              onClick={closeModal}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </ModalFormFooterActions>
        }
      >
        <ModalFormDescription>
          Update your company address to keep your profile up-to-date.
        </ModalFormDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
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
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
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
        </form>
      </FormModal>
    </>
  );
}
