import DriverLicenseView from "@/components/prochauffeur/DriverLicenseView";

export const metadata = {
  title: "Driver licence | ProChauffeur Dispatch",
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function DriverLicensePage({ params }: Props) {
  const { userId } = await params;
  return <DriverLicenseView userId={userId} />;
}
