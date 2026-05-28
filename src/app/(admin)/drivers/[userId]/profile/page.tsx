import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function DriverProfileRedirectPage({ params }: Props) {
  const { userId } = await params;
  redirect(`/drivers/${userId}`);
}
