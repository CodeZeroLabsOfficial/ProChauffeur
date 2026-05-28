import DriverAccreditationView from "@/components/prochauffeur/DriverAccreditationView";

export const metadata = {
  title: "Driver accreditation | ProChauffeur Dispatch",
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function DriverAccreditationPage({ params }: Props) {
  const { userId } = await params;
  return <DriverAccreditationView userId={userId} />;
}
