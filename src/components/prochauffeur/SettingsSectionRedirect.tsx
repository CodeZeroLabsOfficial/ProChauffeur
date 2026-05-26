"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type SettingsSectionRedirectProps = {
  sectionId: string;
  search?: string;
};

export default function SettingsSectionRedirect({
  sectionId,
  search = "",
}: SettingsSectionRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/settings${search}#${sectionId}`);
  }, [router, search, sectionId]);

  return null;
}
