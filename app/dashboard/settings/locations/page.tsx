import { redirect } from "next/navigation";

export default function SettingsLocationsRedirect() {
  redirect("/dashboard/locations");
}
