import type { UserRole, TripStatus } from "@/lib/models/enums";
import type { Trip } from "@/lib/models/trip";

/** Max `text` length on `tripChats/{branchId}/{tripId}/messages/{messageId}`. */
export const TRIP_CHAT_TEXT_MAX = 500;

/** RTDB root for trip threads (`tripChats/{branchId}/{tripId}`). */
export const rtdbTripChatsPath = "tripChats";

export const TRIP_CHAT_SENDER_ROLES = ["customer", "driver"] as const;
export type TripChatSenderRole = (typeof TRIP_CHAT_SENDER_ROLES)[number];

/** Customer may send only while the chauffeur is rolling. */
export const customerTripChatStatuses: TripStatus[] = ["en_route_pickup", "in_progress"];

/** Driver may send once assigned. */
export const driverTripChatStatuses: TripStatus[] = [
  "accepted",
  "en_route_pickup",
  "in_progress"
];

/** Thread meta at `tripChats/{branchId}/{tripId}` (RTDB camelCase ids). */
export interface TripChatThread {
  customerId: string;
  driverId: string;
  status: TripStatus;
}

/** Message at `tripChats/{branchId}/{tripId}/messages/{messageId}`. */
export interface TripChatMessage {
  id: string;
  senderId: string;
  senderRole: TripChatSenderRole;
  text: string;
  createdAt: number;
}

export function rtdbBranchTripChatsPath(branchId: string): string {
  return `${rtdbTripChatsPath}/${branchId}`;
}

export function rtdbTripChatPath(branchId: string, tripId: string): string {
  return `${rtdbBranchTripChatsPath(branchId)}/${tripId}`;
}

export function rtdbTripChatMessagesPath(branchId: string, tripId: string): string {
  return `${rtdbTripChatPath(branchId, tripId)}/messages`;
}

export function isTripChatSenderRole(value: unknown): value is TripChatSenderRole {
  return value === "customer" || value === "driver";
}

export function canCustomerSendTripChat(
  status: TripStatus,
  driverId: string | null | undefined
): boolean {
  return Boolean(driverId?.trim()) && customerTripChatStatuses.includes(status);
}

export function canDriverSendTripChat(
  status: TripStatus,
  driverId: string | null | undefined
): boolean {
  return Boolean(driverId?.trim()) && driverTripChatStatuses.includes(status);
}

/** Customer live-action bar (map / phone / message). */
export function canCustomerUseTripChatActions(
  status: TripStatus,
  driverId: string | null | undefined
): boolean {
  return canCustomerSendTripChat(status, driverId);
}

export function tripChatSenderRoleForUser(
  uid: string,
  customerId: string,
  driverId: string | null | undefined
): TripChatSenderRole | null {
  if (uid && uid === customerId) return "customer";
  if (uid && driverId && uid === driverId) return "driver";
  return null;
}

export function canSendTripChat(input: {
  uid: string;
  role?: UserRole | null;
  status: TripStatus;
  customerId: string;
  driverId: string | null | undefined;
}): boolean {
  const senderRole = tripChatSenderRoleForUser(input.uid, input.customerId, input.driverId);
  if (senderRole === "customer") {
    return canCustomerSendTripChat(input.status, input.driverId);
  }
  if (senderRole === "driver") {
    return canDriverSendTripChat(input.status, input.driverId);
  }
  return false;
}

export function tripChatThreadFromTrip(
  trip: Pick<Trip, "customerID" | "driverID" | "status">
): TripChatThread | null {
  const customerId = trip.customerID.trim();
  const driverId = trip.driverID?.trim() ?? "";
  if (!customerId || !driverId) return null;
  return {
    customerId,
    driverId,
    status: trip.status
  };
}

export function normalizeTripChatText(value: string): string | null {
  const text = value.trim();
  if (!text || text.length > TRIP_CHAT_TEXT_MAX) return null;
  return text;
}
