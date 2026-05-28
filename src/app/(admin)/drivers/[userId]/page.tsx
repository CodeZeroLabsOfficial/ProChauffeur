import DriverProfileEditView from "@/components/prochauffeur/DriverProfileEditView";

export const metadata = {
  title: "Driver overview | ProChauffeur Dispatch",
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function DriverOverviewPage({ params }: Props) {
  const { userId } = await params;
  return <DriverProfileEditView userId={userId} />;
}
