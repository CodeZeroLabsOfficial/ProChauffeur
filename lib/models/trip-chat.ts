import type { StaffRole, UserRole, TripStatus } from "@/lib/models/enums";
import type { Trip } from "@/lib/models/trip";

/** Max `text` length on `tripChats/{branchId}/{tripId}/messages/{messageId}`. */
export const TRIP_CHAT_TEXT_MAX = 500;

/** RTDB root for trip threads (`tripChats/{branchId}/{tripId}`). */
export const rtdbTripChatsPath = "tripChats";

export const TRIP_CHAT_SENDER_ROLES = ["customer", "driver", "staff"] as const;
export type TripChatSenderRole = (typeof TRIP_CHAT_SENDER_ROLES)[number];

/** Customer may send only while the chauffeur is rolling. */
export const customerTripChatStatuses: TripStatus[] = ["en_route_pickup", "in_progress"];

/** Driver may send once assigned. */
export const driverTripChatStatuses: TripStatus[] = [
  "accepted",
  "en_route_pickup",
  "in_progress"
];

/** Staff may send in the same window as the chauffeur. */
export const staffTripChatStatuses: TripStatus[] = driverTripChatStatuses;

/** Dashboard jobs that may join a trip thread. */
export const staffTripChatRoles: StaffRole[] = ["admin", "manager", "dispatcher"];

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
  return value === "customer" || value === "driver" || value === "staff";
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

export function canStaffUseTripChat(staffRole: StaffRole | null | undefined): boolean {
  return Boolean(staffRole && staffTripChatRoles.includes(staffRole));
}

export function canStaffSendTripChat(
  status: TripStatus,
  driverId: string | null | undefined,
  staffRole: StaffRole | null | undefined
): boolean {
  return (
    canStaffUseTripChat(staffRole) &&
    Boolean(driverId?.trim()) &&
    staffTripChatStatuses.includes(status)
  );
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
  driverId: string | null | undefined,
  options?: { role?: UserRole | null; staffRole?: StaffRole | null }
): TripChatSenderRole | null {
  if (uid && uid === customerId) return "customer";
  if (uid && driverId && uid === driverId) return "driver";
  if (options?.role === "admin" && canStaffUseTripChat(options.staffRole)) return "staff";
  return null;
}

export function canSendTripChat(input: {
  uid: string;
  role?: UserRole | null;
  staffRole?: StaffRole | null;
  status: TripStatus;
  customerId: string;
  driverId: string | null | undefined;
}): boolean {
  const senderRole = tripChatSenderRoleForUser(input.uid, input.customerId, input.driverId, {
    role: input.role,
    staffRole: input.staffRole
  });
  if (senderRole === "customer") {
    return canCustomerSendTripChat(input.status, input.driverId);
  }
  if (senderRole === "driver") {
    return canDriverSendTripChat(input.status, input.driverId);
  }
  if (senderRole === "staff") {
    return canStaffSendTripChat(input.status, input.driverId, input.staffRole);
  }
  return false;
}

export function tripChatSenderLabel(role: TripChatSenderRole): string {
  if (role === "customer") return "Passenger";
  if (role === "driver") return "Chauffeur";
  return "Dispatch";
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
