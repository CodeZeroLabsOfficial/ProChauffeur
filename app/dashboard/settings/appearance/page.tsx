"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { deleteField, type DocumentData } from "firebase/firestore";
import { Trash2Icon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PersonalThemeControls } from "@/components/settings/personal-theme-controls";
import { ThemeModeSelector } from "@/components/settings/theme-mode-selector";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  fetchSettingDoc,
  saveSettingDoc,
  uploadBrandingFavicon,
  uploadBrandingLogo
} from "@/lib/services/firebase-service";
import {
  BRANDING_FONTS,
  DEFAULT_BRANDING_FONT,
  isBrandingFontId,
  type BrandingFontId
} from "@/lib/fonts-config";
import { AppSettingsDocs, type Appearance } from "@/lib/models";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function ImageUploadField({
  label,
  title,
  description,
  previewUrl,
  errors,
  onOpenDialog,
  inputProps,
  onRemove,
  alt
}: {
  label: string;
  title: string;
  description: string;
  previewUrl: string | null;
  errors: string[];
  onOpenDialog: () => void;
  inputProps: React.InputHTMLAttributes<HTMLInputElement> & { ref: React.Ref<HTMLInputElement> };
  onRemove: () => void;
  alt: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Item
        variant="outline"
        className="cursor-pointer"
        onClick={onOpenDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDialog();
          }
        }}>
        <ItemMedia variant="image">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={alt}
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
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <UploadIcon className="text-muted-foreground size-4" />
        </ItemActions>
      </Item>
      <input {...inputProps} className="sr-only" aria-label={label} />
      {errors.length > 0 && <p className="text-destructive text-sm">{errors[0]}</p>}
      {previewUrl && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2Icon className="size-4" />
          Remove {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

export default function AppearancePage() {
  const router = useRouter();
  const [appearance, setAppearance] = useState<Appearance>({ portalName: "ProChauffeur" });
  const [fontFamily, setFontFamily] = useState<BrandingFontId>(DEFAULT_BRANDING_FONT);
  const [primaryColorHex, setPrimaryColorHex] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconRemoved, setFaviconRemoved] = useState(false);

  const [
    { files: logoFiles, errors: logoErrors },
    {
      openFileDialog: openLogoDialog,
      getInputProps: getLogoInputProps,
      removeFile: removeLogoFile,
      clearFiles: clearLogoFiles
    }
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
  const faviconPreviewUrl = faviconFiles[0]?.preview ?? (faviconRemoved ? null : faviconUrl);

  useEffect(() => {
    fetchSettingDoc<Appearance>(AppSettingsDocs.appearance)
      .then((settings) => {
        if (!settings) return;
        setAppearance((prev) => ({ ...prev, ...settings }));
        setLogoUrl(settings.logoUrl ?? null);
        setFaviconUrl(settings.faviconUrl ?? null);
        setPrimaryColorHex(settings.primaryColorHex ?? "");
        setFontFamily(
          settings.fontFamily && isBrandingFontId(settings.fontFamily)
            ? settings.fontFamily
            : DEFAULT_BRANDING_FONT
        );
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

  async function onSubmitPortal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let nextLogoUrl = logoRemoved ? "" : (logoUrl ?? "");
    let nextFaviconUrl = faviconRemoved ? "" : (faviconUrl ?? "");

    const uploadedLogo = logoFiles[0]?.file;
    if (uploadedLogo instanceof File) {
      try {
        nextLogoUrl = await uploadBrandingLogo(uploadedLogo);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not upload logo.");
        return;
      }
    }

    const uploadedFavicon = faviconFiles[0]?.file;
    if (uploadedFavicon instanceof File) {
      try {
        nextFaviconUrl = await uploadBrandingFavicon(uploadedFavicon);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not upload favicon.");
        return;
      }
    }

    const nextPrimary = String(form.get("primaryColorHex") ?? "").trim();
    const data: DocumentData = {
      portalName: String(form.get("portalName") ?? "").trim() || "ProChauffeur",
      primaryColorHex: nextPrimary,
      fontFamily
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

    if (!nextPrimary) {
      data.primaryColorHex = deleteField();
    }

    setSaving(true);
    try {
      await saveSettingDoc(AppSettingsDocs.appearance, data);
      const saved: Appearance = {
        portalName: data.portalName as string,
        primaryColorHex: nextPrimary || undefined,
        fontFamily,
        logoUrl: logoRemoved ? undefined : nextLogoUrl || undefined,
        faviconUrl: faviconRemoved ? undefined : nextFaviconUrl || undefined
      };
      setAppearance(saved);
      setPrimaryColorHex(nextPrimary);
      setLogoUrl(logoRemoved ? null : nextLogoUrl || null);
      setLogoRemoved(false);
      clearLogoFiles();
      setFaviconUrl(faviconRemoved ? null : nextFaviconUrl || null);
      setFaviconRemoved(false);
      clearFaviconFiles();
      toast.success("Portal appearance saved.");
      router.refresh();
    } catch {
      toast.error("Could not save portal appearance.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Portal</h3>
            <p className="text-muted-foreground text-sm">
              Branding shared across the portal for all administrators.
            </p>
          </div>
          <form onSubmit={onSubmitPortal} className="space-y-6" key={appearance.portalName}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portalName">Portal name</Label>
                <Input id="portalName" name="portalName" defaultValue={appearance.portalName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColorHex">Primary colour</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColorHex"
                    name="primaryColorHex"
                    value={primaryColorHex}
                    onChange={(e) => setPrimaryColorHex(e.target.value)}
                    placeholder="#0f172a"
                  />
                  {primaryColorHex && (
                    <span
                      className="size-9 shrink-0 rounded-md border"
                      style={{ backgroundColor: primaryColorHex }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font</Label>
              <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as BrandingFontId)}>
                <SelectTrigger id="fontFamily" className="w-full sm:max-w-md">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {BRANDING_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Set the font you want to use in the dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploadField
                label="Logo"
                title="Upload logo"
                description="Square image recommended. PNG, JPG, WebP, or SVG. Max 5 MB."
                previewUrl={logoPreviewUrl}
                errors={logoErrors}
                onOpenDialog={openLogoDialog}
                inputProps={getLogoInputProps()}
                onRemove={handleRemoveLogo}
                alt="Portal logo"
              />
              <ImageUploadField
                label="Favicon"
                title="Upload favicon"
                description="Square image, 32×32 or larger. PNG, ICO, or SVG. Max 5 MB."
                previewUrl={faviconPreviewUrl}
                errors={faviconErrors}
                onOpenDialog={openFaviconDialog}
                inputProps={getFaviconInputProps()}
                onRemove={handleRemoveFavicon}
                alt="Portal favicon"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save portal settings"}
            </Button>
          </form>
        </section>

        <Separator />

        <section className="space-y-6">
          <div>
            <h3 className="text-sm font-medium">Personal preferences</h3>
            <p className="text-muted-foreground text-sm">
              These apply only to your account on this device.
            </p>
          </div>
          <ThemeModeSelector />
          <PersonalThemeControls />
        </section>
      </CardContent>
    </Card>
  );
}
