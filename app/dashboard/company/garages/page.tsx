import { redirect } from "next/navigation";

/** Garages UI retired — office lives on Company → Locations. */
export default function GaragesRedirectPage() {
  redirect("/dashboard/company/locations");
}
