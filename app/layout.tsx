import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";

import "./globals.css";

import { cn } from "@/lib/utils";
import { fontVariables } from "@/lib/fonts";
import { ActiveThemeProvider } from "@/components/active-theme";
import { DEFAULT_THEME } from "@/lib/themes";
import { Toaster } from "@/components/ui/sonner";
import { fetchBrandingAdmin } from "@/lib/firebase/admin-settings";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchBrandingAdmin();
  const portalName = branding?.portalName?.trim() || "ProChauffeur";
  const iconUrl = branding?.faviconUrl || branding?.logoUrl;

  return {
    title: `${portalName} — Operations Portal`,
    description: "Admin portal for managing chauffeur dispatch, bookings, fleet, drivers and billing.",
    ...(iconUrl ? { icons: { icon: iconUrl } } : {})
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const themeSettings = {
    preset: (cookieStore.get("theme_preset")?.value ?? DEFAULT_THEME.preset) as never,
    scale: (cookieStore.get("theme_scale")?.value ?? DEFAULT_THEME.scale) as never,
    radius: (cookieStore.get("theme_radius")?.value ?? DEFAULT_THEME.radius) as never,
    contentLayout: (cookieStore.get("theme_content_layout")?.value ??
      DEFAULT_THEME.contentLayout) as never
  };

  const bodyAttributes = Object.fromEntries(
    Object.entries(themeSettings)
      .filter(([, value]) => value)
      .map(([key, value]) => [`data-theme-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value])
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn("bg-background group/layout font-sans", fontVariables)}
        {...bodyAttributes}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ActiveThemeProvider initialTheme={themeSettings}>
            {children}
            <Toaster position="top-center" richColors />
            <NextTopLoader color="var(--primary)" showSpinner={false} height={2} />
          </ActiveThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
