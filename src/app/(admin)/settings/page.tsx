import SettingsView from "@/components/prochauffeur/SettingsView";
import { pageTitle } from "@/lib/prochauffeur/site";
import { Suspense } from "react";

export const metadata = {
  title: pageTitle("Settings"),
};

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
