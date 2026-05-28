"use client";

import Button from "@/components/ui/button/Button";
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
  value: string;
  preview: BrandingAssetPreview;
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
  value,
  preview,
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

  const { getInputProps, open } = useDropzone({
    onDrop: (files) => void onDrop(files),
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const hasPreview = value.trim() && !isLegacyStaticBrandingPath(value);
  const previewSizeClass =
    preview === "compact" ? "h-10 w-10" : "h-10 min-w-[72px] max-w-[120px] px-2";

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</p>
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 ${previewSizeClass}`}
        >
          {hasPreview ? (
            <Image
              src={value}
              alt={label}
              width={preview === "compact" ? 40 : 120}
              height={40}
              className={
                preview === "compact"
                  ? "h-full w-full object-contain p-1"
                  : "max-h-8 w-auto object-contain"
              }
              unoptimized={shouldUnoptimizePreview(value)}
            />
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <input {...getInputProps()} id={id} />
        <Button type="button" size="sm" variant="outline" onClick={open}>
          Upload
        </Button>
      </div>
    </div>
  );
}
