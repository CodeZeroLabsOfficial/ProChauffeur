import DriverAvailabilityView from "@/components/prochauffeur/DriverAvailabilityView";

export const metadata = {
  title: "Driver availability | ProChauffeur Dispatch",
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function DriverAvailabilityPage({ params }: Props) {
  const { userId } = await params;
  return <DriverAvailabilityView userId={userId} />;
}
