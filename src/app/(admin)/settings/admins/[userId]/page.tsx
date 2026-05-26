import SettingsSectionRedirect from "@/components/prochauffeur/SettingsSectionRedirect";

export default function SettingsAdminAccountPage({
  params,
}: {
  params: { userId: string };
}) {
  return (
    <SettingsSectionRedirect
      sectionId="administrators"
      search={`?admin=${encodeURIComponent(params.userId)}`}
    />
  );
}
