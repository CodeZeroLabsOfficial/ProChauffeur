import DriverSettingsLayout from "@/layout/DriverSettingsLayout";
import React from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
};

export default async function DriverDetailLayout({ children, params }: Props) {
  const { userId } = await params;
  return <DriverSettingsLayout userId={userId}>{children}</DriverSettingsLayout>;
}
