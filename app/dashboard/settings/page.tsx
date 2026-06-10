"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { deleteField, type DocumentData } from "firebase/firestore";
import { Trash2Icon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useFileUpload } from "@/hooks/use-file-upload";
import {
  fetchSettingDoc,
  saveSettingDoc,
  uploadBrandingFavicon,
  uploadBrandingLogo
} from "@/lib/services/firebase-service";
import { AppSettingsDocs, type Branding } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function BrandingPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding>({ portalName: "ProChauffeur" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconRemoved, setFaviconRemoved] = useState(false);

  const [
    { files: logoFiles, errors: logoErrors },
    { openFileDialog: openLogoDialog, getInputProps: getLogoInputProps, removeFile: removeLogoFile, clearFiles: clearLogoFiles }
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
    maxSize: MAX_IMAGE_BYTES,
    onFilesAdded: () => setLogoRemoved(false)
  });

  const [
    { files: faviconFiles, errors: faviconErrors },
    {
      openFileDialog: openFaviconDialog,
      getInputProps: getFaviconInputProps,
      removeFile: removeFaviconFile,
      clearFiles: clearFaviconFiles
    }
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico",
    maxSize: MAX_IMAGE_BYTES,
    onFilesAdded: () => setFaviconRemoved(false)
  });

  const logoPreviewUrl = logoFiles[0]?.preview ?? (logoRemoved ? null : logoUrl);
  const faviconPreviewUrl =
    faviconFiles[0]?.preview ?? (faviconRemoved ? null : faviconUrl);

  useEffect(() => {
    fetchSettingDoc<Branding>(AppSettingsDocs.branding)
      .then((b) => {
        if (!b) return;
        setBranding((prev) => ({ ...prev, ...b }));
        setLogoUrl(b.logoUrl ?? null);
        setFaviconUrl(b.faviconUrl ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleRemoveLogo() {
    if (logoFiles[0]) removeLogoFile(logoFiles[0].id);
    setLogoUrl(null);
    setLogoRemoved(true);
  }

  function handleRemoveFavicon() {
    if (faviconFiles[0]) removeFaviconFile(faviconFiles[0].id);
    setFaviconUrl(null);
    setFaviconRemoved(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let nextLogoUrl = logoRemoved ? "" : (logoUrl ?? "");
    let nextFaviconUrl = faviconRemoved ? "" : (faviconUrl ?? "");

    const uploadedLogo = logoFiles[0]?.file;
    if (uploadedLogo instanceof File) {
      try {
        nextLogoUrl = await uploadBrandingLogo(uploadedLogo);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not upload logo.";
        toast.error(message);
        return;
      }
    }

    const uploadedFavicon = faviconFiles[0]?.file;
    if (uploadedFavicon instanceof File) {
      try {
        nextFaviconUrl = await uploadBrandingFavicon(uploadedFavicon);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not upload favicon.";
        toast.error(message);
        return;
      }
    }

    const data: DocumentData = {
      portalName: String(form.get("portalName") ?? "").trim() || "ProChauffeur",
      supportEmail: String(form.get("supportEmail") ?? "").trim(),
      primaryColorHex: String(form.get("primaryColorHex") ?? "").trim()
    };

    if (logoRemoved) {
      data.logoUrl = deleteField();
    } else if (nextLogoUrl) {
      data.logoUrl = nextLogoUrl;
    }

    if (faviconRemoved) {
      data.faviconUrl = deleteField();
    } else if (nextFaviconUrl) {
      data.faviconUrl = nextFaviconUrl;
    }

    setSaving(true);
    try {
      await saveSettingDoc(AppSettingsDocs.branding, data);
      const savedBranding: Branding = {
        portalName: data.portalName as string,
        supportEmail: data.supportEmail as string | undefined,
        primaryColorHex: data.primaryColorHex as string | undefined,
        logoUrl: logoRemoved ? undefined : nextLogoUrl || undefined,
        faviconUrl: faviconRemoved ? undefined : nextFaviconUrl || undefined
      };
      setBranding(savedBranding);
      setLogoUrl(logoRemoved ? null : nextLogoUrl || null);
      setLogoRemoved(false);
      clearLogoFiles();
      setFaviconUrl(faviconRemoved ? null : nextFaviconUrl || null);
      setFaviconRemoved(false);
      clearFaviconFiles();
      toast.success("Branding saved.");
      router.refresh();
    } catch {
      toast.error("Could not save branding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-lg space-y-4" key={branding.portalName}>
          <div className="space-y-2">
            <Label htmlFor="portalName">Portal name</Label>
            <Input id="portalName" name="portalName" defaultValue={branding.portalName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={branding.supportEmail}
              placeholder="support@prochauffeur.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColorHex">Primary colour</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primaryColorHex"
                name="primaryColorHex"
                defaultValue={branding.primaryColorHex}
                placeholder="#0f172a"
              />
              {branding.primaryColorHex && (
                <span
                  className="size-9 shrink-0 rounded-md border"
                  style={{ backgroundColor: branding.primaryColorHex }}
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <Item
              variant="outline"
              className="cursor-pointer"
              onClick={openLogoDialog}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openLogoDialog();
                }
              }}>
              <ItemMedia variant="image">
                {logoPreviewUrl ? (
                  <Image
                    src={logoPreviewUrl}
                    alt="Portal logo"
                    width={40}
                    height={40}
                    className="aspect-square size-10 rounded-sm object-cover"
                    unoptimized={logoPreviewUrl.startsWith("blob:")}
                  />
                ) : (
                  <div className="bg-muted flex size-full items-center justify-center">
                    <UploadIcon className="text-muted-foreground size-4" />
                  </div>
                )}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Upload logo</ItemTitle>
                <ItemDescription>
                  Square image recommended. PNG, JPG, WebP, or SVG. Max 5 MB.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <UploadIcon className="text-muted-foreground size-4" />
              </ItemActions>
            </Item>
            <input {...getLogoInputProps()} className="sr-only" aria-label="Upload logo" />
            {logoErrors.length > 0 && (
              <p className="text-destructive text-sm">{logoErrors[0]}</p>
            )}
            {logoPreviewUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                <Trash2Icon className="size-4" />
                Remove logo
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Favicon</Label>
            <Item
              variant="outline"
              className="cursor-pointer"
              onClick={openFaviconDialog}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFaviconDialog();
                }
              }}>
              <ItemMedia variant="image">
                {faviconPreviewUrl ? (
                  <Image
                    src={faviconPreviewUrl}
                    alt="Portal favicon"
                    width={40}
                    height={40}
                    className="aspect-square size-10 rounded-sm object-cover"
                    unoptimized={faviconPreviewUrl.startsWith("blob:")}
                  />
                ) : (
                  <div className="bg-muted flex size-full items-center justify-center">
                    <UploadIcon className="text-muted-foreground size-4" />
                  </div>
                )}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Upload favicon</ItemTitle>
                <ItemDescription>
                  Square image, 32×32 or larger. PNG, ICO, or SVG. Max 5 MB.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <UploadIcon className="text-muted-foreground size-4" />
              </ItemActions>
            </Item>
            <input {...getFaviconInputProps()} className="sr-only" aria-label="Upload favicon" />
            {faviconErrors.length > 0 && (
              <p className="text-destructive text-sm">{faviconErrors[0]}</p>
            )}
            {faviconPreviewUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFavicon}>
                <Trash2Icon className="size-4" />
                Remove favicon
              </Button>
            )}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
