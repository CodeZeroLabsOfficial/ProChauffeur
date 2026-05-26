"use client";

import Image from "next/image";
import React, { useId } from "react";

export default function ProfilePicturePicker({
  photoURL,
  displayName,
  onPhotoChange,
}: {
  photoURL: string;
  displayName: string;
  onPhotoChange: (value: string) => void;
}) {
  const inputId = useId();
  const previewName = displayName.trim() || "User";
  const avatarInitial = previewName.charAt(0).toUpperCase();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onPhotoChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div>
      <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
        Change Profile Picture
      </h5>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
            {photoURL.trim() ? (
              <Image
                width={80}
                height={80}
                src={photoURL}
                alt={previewName}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-brand-500 text-xl font-semibold text-white">
                {avatarInitial}
              </span>
            )}
          </div>
          <label
            htmlFor={inputId}
            className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.05]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="fill-current"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.874 3.75C7.659 3.75 7.457 3.856 7.328 4.033L6.328 5.433C6.188 5.626 5.969 5.75 5.729 5.75H4.5C3.809 5.75 3.25 6.309 3.25 7V14.5C3.25 15.191 3.809 15.75 4.5 15.75H15.5C16.191 15.75 16.75 15.191 16.75 14.5V7C16.75 6.309 16.191 5.75 15.5 5.75H14.271C14.031 5.75 13.812 5.626 13.672 5.433L12.672 4.033C12.543 3.856 12.341 3.75 12.126 3.75H7.874ZM10 8.25C8.205 8.25 6.75 9.705 6.75 11.5C6.75 13.295 8.205 14.75 10 14.75C11.795 14.75 13.25 13.295 13.25 11.5C13.25 9.705 11.795 8.25 10 8.25Z"
                fill=""
              />
            </svg>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 sm:text-left">
          Upload a square image (200×200 px) in JPEG or PNG format.
        </p>
      </div>
    </div>
  );
}
