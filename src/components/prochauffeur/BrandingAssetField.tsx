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
  const previewBoxClass =
    preview === "compact"
      ? "h-12 w-12"
      : "h-12 min-w-[80px] max-w-[160px] px-2";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/30 sm:p-5">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
        {label}
      </h4>

      <div
        className={`mt-4 flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${previewBoxClass}`}
      >
        {hasPreview ? (
          <Image
            src={value}
            alt={label}
            width={preview === "compact" ? 48 : 160}
            height={48}
            className={
              preview === "compact"
                ? "h-full w-full object-contain p-1.5"
                : "max-h-10 w-auto object-contain"
            }
            unoptimized={shouldUnoptimizePreview(value)}
          />
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">No image</span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-end pt-4">
        <input {...getInputProps()} id={id} />
        <Button type="button" size="sm" variant="outline" onClick={open}>
          Upload
        </Button>
      </div>
    </div>
  );
}
