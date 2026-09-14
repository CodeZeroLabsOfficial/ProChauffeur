import { TripChatPage } from "@/app/dashboard/bookings/[id]/chat/trip-chat-page";

export default async function BookingChatRoute({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripChatPage tripId={id} />;
}
