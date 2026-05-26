import CompanyPlaceholderView from "@/components/prochauffeur/CompanyPlaceholderView";

export const metadata = {
  title: "Dispatch guides | ProChauffeur Dispatch",
};

export default function CompanyGuidesPage() {
  return (
    <CompanyPlaceholderView
      title="Dispatch guides"
      description="Quick-reference playbooks for airports, venues, and VIP protocols."
      message="Publish quick-reference playbooks for airports, venues, and VIP protocols — your in-app equivalent of patient-facing articles. Content tools will plug into this library."
    />
  );
}
