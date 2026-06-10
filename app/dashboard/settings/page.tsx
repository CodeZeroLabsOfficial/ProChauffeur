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

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export default function BrandingPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding>({ portalName: "ProChauffeur" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);

  const [{ files, errors }, { openFileDialog, getInputProps, removeFile, clearFiles }] =
    useFileUpload({
      accept: "image/png,image/jpeg,image/webp,image/svg+xml",
      maxSize: MAX_LOGO_BYTES,
      onFilesAdded: () => setLogoRemoved(false)
    });

  const previewUrl = files[0]?.preview ?? (logoRemoved ? null : logoUrl);

  useEffect(() => {
    fetchSettingDoc<Branding>(AppSettingsDocs.branding)
      .then((b) => {
        if (!b) return;
        setBranding((prev) => ({ ...prev, ...b }));
        setLogoUrl(b.logoUrl ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleRemoveLogo() {
    if (files[0]) removeFile(files[0].id);
    setLogoUrl(null);
    setLogoRemoved(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let nextLogoUrl = logoRemoved ? "" : (logoUrl ?? "");

    const uploadedFile = files[0]?.file;
    if (uploadedFile instanceof File) {
      try {
        nextLogoUrl = await uploadBrandingLogo(uploadedFile);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not upload logo.";
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

    setSaving(true);
    try {
      await saveSettingDoc(AppSettingsDocs.branding, data);
      const savedBranding: Branding = {
        portalName: data.portalName as string,
        supportEmail: data.supportEmail as string | undefined,
        primaryColorHex: data.primaryColorHex as string | undefined,
        logoUrl: logoRemoved ? undefined : nextLogoUrl || undefined
      };
      setBranding(savedBranding);
      setLogoUrl(logoRemoved ? null : nextLogoUrl || null);
      setLogoRemoved(false);
      clearFiles();
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
              onClick={openFileDialog}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFileDialog();
                }
              }}>
              <ItemMedia variant="image">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Portal logo"
                    width={40}
                    height={40}
                    className="aspect-square size-10 rounded-sm object-cover"
                    unoptimized={previewUrl.startsWith("blob:")}
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
            <input {...getInputProps()} className="sr-only" aria-label="Upload logo" />
            {errors.length > 0 && (
              <p className="text-destructive text-sm">{errors[0]}</p>
            )}
            {previewUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                <Trash2Icon className="size-4" />
                Remove logo
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
