import { redirect } from "next/navigation";

/** Old Settings → Locations URL; city Locations now live under Company. */
export default function SettingsLocationsRedirect() {
  redirect("/dashboard/company/locations");
}
