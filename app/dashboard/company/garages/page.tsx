import { redirect } from "next/navigation";

/** Garages UI retired — office lives on Locations. */
export default function GaragesRedirect() {
  redirect("/dashboard/locations");
}
