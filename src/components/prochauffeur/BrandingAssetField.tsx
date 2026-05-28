"use client";

import {
  isLegacyStaticBrandingPath,
  type BrandingAssetPreview,
} from "@/lib/prochauffeur/brandingAssets";
import { MAX_BRANDING_FILE_BYTES } from "@/lib/prochauffeur/brandingValidation";
import Image from "next/image";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

const ACCEPTED_IMAGE_TYPES = {
  "image/png": [],
  "image/jpeg": [],
  "image/webp": [],
  "image/svg+xml": [],
};

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

type BrandingAssetFieldProps = {
  id: string;
  label: string;
  usage: string;
  value: string;
  preview: BrandingAssetPreview;
  showLabel?: boolean;
  onChange: (value: string) => void;
  onUploadError?: (message: string) => void;
};

function shouldUnoptimizePreview(src: string): boolean {
  return (
    src.startsWith("data:") || src.includes("firebasestorage.googleapis.com")
  );
}

export default function BrandingAssetField({
  id,
  label,
  usage,
  value,
  preview,
  showLabel = true,
  onChange,
  onUploadError,
}: BrandingAssetFieldProps) {
  const maxFileLabelKb = Math.round(MAX_BRANDING_FILE_BYTES / 1024);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_BRANDING_FILE_BYTES) {
        onUploadError?.(
          `"${file.name}" is too large. Choose an image under ${maxFileLabelKb} KB.`
        );
        return;
      }

      try {
        const dataUrl = await readImageFile(file);
        onChange(dataUrl);
      } catch {
        onUploadError?.(
          "Could not read that image. Try a different PNG, JPG, WebP, or SVG file."
        );
      }
    },
    [maxFileLabelKb, onChange, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => void onDrop(files),
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const previewBoxClass =
    preview === "compact"
      ? "h-16 w-16"
      : "h-16 min-w-[140px] max-w-[220px] px-4";

  const dropzone = (
    <div
      {...getRootProps()}
      className={`flex min-h-16 flex-1 items-center rounded-xl border border-dashed p-5 transition ${
        isDragActive
          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10"
          : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      <input {...getInputProps()} id={id} />
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Drag and drop a PNG, JPG, WebP, or SVG file here, or{" "}
        <button
          type="button"
          onClick={open}
          className="font-medium text-brand-500 underline hover:text-brand-600 dark:hover:text-brand-400"
        >
          browse
        </button>
        .
      </p>
    </div>
  );

  const previewBox = (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 ${previewBoxClass}`}
    >
      {value.trim() && !isLegacyStaticBrandingPath(value) ? (
        <Image
          src={value}
          alt={label}
          width={preview === "compact" ? 64 : 200}
          height={64}
          className={
            preview === "compact"
              ? "h-full w-full object-contain p-2"
              : "max-h-14 w-auto object-contain"
          }
          unoptimized={shouldUnoptimizePreview(value)}
        />
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">No image</span>
      )}
    </div>
  );

  if (!showLabel) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {previewBox}
        {dropzone}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {previewBox}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{usage}</p>
        <div className="mt-3">{dropzone}</div>
      </div>
    </div>
  );
}
