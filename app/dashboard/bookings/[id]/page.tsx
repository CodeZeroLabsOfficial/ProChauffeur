import { BookingDetail } from "@/app/dashboard/bookings/[id]/booking-detail";

export default async function BookingDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetail tripId={id} />;
}
