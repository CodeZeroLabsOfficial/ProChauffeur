"use client";

import { ensureFirebaseInitialized } from "@/lib/firebase/client";
import { mergeFleetBrandingSettings } from "@/lib/prochauffeur/brandingAssets";
import { listenFleetBranding } from "@/lib/prochauffeur/firestore";
import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FleetBrandingContextValue = {
  branding: AppFleetBrandingSettings;
  isLoading: boolean;
};

const FleetBrandingContext = createContext<FleetBrandingContextValue | null>(
  null
);

function FleetBrandingFavicon({ href }: { href: string }) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [href]);

  return null;
}

export function FleetBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState<AppFleetBrandingSettings>(() =>
    mergeFleetBrandingSettings(null)
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await ensureFirebaseInitialized();
        if (cancelled) return;

        unsub = listenFleetBranding((next) => {
          setBranding(next);
          setIsLoading(false);
        });
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      branding,
      isLoading,
    }),
    [branding, isLoading]
  );

  return (
    <FleetBrandingContext.Provider value={value}>
      <FleetBrandingFavicon href={branding.favicon} />
      {children}
    </FleetBrandingContext.Provider>
  );
}

export function useFleetBranding(): FleetBrandingContextValue {
  const context = useContext(FleetBrandingContext);
  if (!context) {
    throw new Error(
      "useFleetBranding must be used within FleetBrandingProvider"
    );
  }
  return context;
}

export function isBrandingDataUrl(src: string): boolean {
  return src.startsWith("data:");
}
