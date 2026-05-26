"use client";

import ProfilePicturePicker from "@/components/user-profile/ProfilePicturePicker";
import { splitDisplayName } from "@/components/user-profile/profileDisplay";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import React, { useEffect, useState } from "react";

const defaultSocialLinks = {
  facebook: "https://www.facebook.com/PimjoHQ",
  x: "https://x.com/PimjoHQ",
  linkedin: "https://www.linkedin.com/company/pimjo",
  instagram: "https://instagram.com/PimjoHQ",
};

type EditPersonalInformationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
};

export default function EditPersonalInformationModal({
  isOpen,
  onClose,
  onSave,
}: EditPersonalInformationModalProps) {
  const { appUser } = useAuth();

  const displayName =
    appUser?.profile.displayName.trim() || appUser?.email || "Administrator";
  const { firstName: initialFirst, lastName: initialLast } =
    splitDisplayName(displayName);

  const [photoURL, setPhotoURL] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("Fleet Administrator");
  const [facebook, setFacebook] = useState(defaultSocialLinks.facebook);
  const [xProfile, setXProfile] = useState(defaultSocialLinks.x);
  const [linkedin, setLinkedin] = useState(defaultSocialLinks.linkedin);
  const [instagram, setInstagram] = useState(defaultSocialLinks.instagram);

  useEffect(() => {
    if (!isOpen) return;
    setPhotoURL(appUser?.profile.photoURL?.trim() ?? "");
    setFirstName(initialFirst);
    setLastName(initialLast);
    setEmail(appUser?.email ?? "");
    setPhone(appUser?.profile.phoneNumber?.trim() ?? "");
    setBio("Fleet Administrator");
    setFacebook(defaultSocialLinks.facebook);
    setXProfile(defaultSocialLinks.x);
    setLinkedin(defaultSocialLinks.linkedin);
    setInstagram(defaultSocialLinks.instagram);
  }, [isOpen, appUser, initialFirst, initialLast]);

  function handleSave() {
    onSave?.();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Personal Information
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Update your details to keep your profile up-to-date.
          </p>
        </div>
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
            <ProfilePicturePicker
              photoURL={photoURL}
              displayName={displayName}
              onPhotoChange={setPhotoURL}
            />

            <div className="mt-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                Personal Information
              </h5>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2 lg:col-span-1">
                  <Label>First Name</Label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Last Name</Label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Email Address</Label>
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

                <div className="col-span-2">
                  <Label>Bio</Label>
                  <Input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                Social Links
              </h5>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>Facebook</Label>
                  <Input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                </div>

                <div>
                  <Label>X.com</Label>
                  <Input
                    type="text"
                    value={xProfile}
                    onChange={(e) => setXProfile(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Linkedin</Label>
                  <Input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Instagram</Label>
                  <Input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button size="sm" variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
