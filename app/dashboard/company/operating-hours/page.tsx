import { redirect } from "next/navigation";

export default function OperatingHoursRedirect() {
  redirect("/dashboard/locations");
}
