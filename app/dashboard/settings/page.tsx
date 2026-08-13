import { redirect } from "next/navigation";

import { defaultSettingsHref } from "@/lib/auth/staff-access";
import { getAdminSessionUser } from "@/lib/firebase/session";

export default async function SettingsIndexPage() {
  const user = await getAdminSessionUser();
  redirect(defaultSettingsHref(user?.staffRole));
}
