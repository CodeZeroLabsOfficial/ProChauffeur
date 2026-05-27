import { AuthProvider } from '@/context/AuthContext';
import { FleetBrandingProvider } from '@/context/FleetBrandingContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import "flatpickr/dist/flatpickr.css";
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: "ProChauffeur Dispatch",
    template: "%s | ProChauffeur Dispatch",
  },
  description: "ProChauffeur fleet dispatch and administration console.",
};

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            <FleetBrandingProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </FleetBrandingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
