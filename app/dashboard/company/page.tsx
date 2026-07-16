import { redirect } from "next/navigation";

export default function CompanyOverviewRedirect() {
  redirect("/dashboard/settings/company");
}
