import SettingsLayout from "@/layout/SettingsLayout";
import React from "react";

export default function SettingsRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
