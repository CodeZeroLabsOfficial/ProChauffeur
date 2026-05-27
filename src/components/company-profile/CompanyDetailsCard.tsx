"use client";

import CompanyLogoPicker from "@/components/company-profile/CompanyLogoPicker";
import SettingsEditableCard from "@/components/company-profile/SettingsEditableCard";
import {
  displayValue,
  trimmedCompanyProfile,
} from "@/components/company-profile/displayValue";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import Image from "next/image";
import React, { useEffect, useState } from "react";

function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const detailFields = [
  { key: "displayName" as const, label: "Company name" },
  { key: "phone" as const, label: "Phone" },
  { key: "email" as const, label: "Email" },
  { key: "website" as const, label: "Website" },
  { key: "abn" as const, label: "ABN" },
  { key: "acn" as const, label: "ACN" },
];

export default function CompanyDetailsCard() {
  const { companyProfile, saveCompany, isSaving } = useAdminOperations();
  const { isOpen, openModal, closeModal } = useModal();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [abn, setAbn] = useState("");
  const [acn, setAcn] = useState("");
  const [logoURL, setLogoURL] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(companyProfile.displayName);
    setPhone(companyProfile.phone);
    setEmail(companyProfile.email);
    setWebsite(companyProfile.website);
    setAbn(companyProfile.abn);
    setAcn(companyProfile.acn);
    setLogoURL(companyProfile.logoURL);
  }, [isOpen, companyProfile]);

  const name = displayValue(companyProfile.displayName, "Your company");
  const subtitle = [companyProfile.phone, companyProfile.email]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ");

  async function handleSave() {
    const ok = await saveCompany(
      trimmedCompanyProfile({
        ...companyProfile,
        displayName,
        phone,
        email,
        website,
        abn,
        acn,
        logoURL,
      })
    );
    if (ok) closeModal();
  }

  return (
    <>
      <SettingsEditableCard
        onEdit={openModal}
        editAriaLabel="Edit company information"
      >
        <div className="flex flex-col gap-5 pe-10 xl:flex-row xl:items-center">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
              {companyProfile.logoURL.trim() ? (
                <Image
                  width={80}
                  height={80}
                  src={companyProfile.logoURL}
                  alt={`${name} logo`}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-xl font-semibold text-gray-500 dark:text-gray-400">
                  {companyInitials(name)}
                </span>
              )}
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-center text-lg font-semibold text-gray-800 dark:text-white/90 xl:text-left">
                {name}
              </h4>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 xl:text-left">
                {subtitle || "Add company contact details"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:grid-cols-3 2xl:gap-x-32">
          {detailFields.map(({ key, label }) => (
            <div key={key}>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                {label}
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {displayValue(companyProfile[key])}
              </p>
            </div>
          ))}
        </div>
      </SettingsEditableCard>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit company information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your company details to keep your profile up-to-date.
            </p>
          </div>
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
              <CompanyLogoPicker
                logoURL={logoURL}
                companyName={displayName}
                onLogoChange={setLogoURL}
              />
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Company information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Company name</Label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email</Label>
                    <Input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Website</Label>
                    <Input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>ABN</Label>
                    <Input
                      type="text"
                      value={abn}
                      onChange={(e) => setAbn(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>ACN</Label>
                    <Input
                      type="text"
                      value={acn}
                      onChange={(e) => setAcn(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={closeModal}
                disabled={isSaving}
              >
                Close
              </Button>
              <Button size="sm" disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
