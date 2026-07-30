import type { Invoice } from "@/lib/models/invoice";
import type { Vehicle } from "@/lib/models/vehicle";
import { effectiveChauffeurUserId } from "@/lib/models/vehicle";
import type { Trip } from "@/lib/models/trip";
import {
  getMonthRange,
  invoiceRevenueInRange,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";
import {
  invoicesForDriver,
  paidRevenueForInvoices
} from "@/app/dashboard/drivers/lib/driver-profile-metrics";

export function tripsForVehicle(trips: Trip[], vehicle: Vehicle): Trip[] {
  const chauffeurId = effectiveChauffeurUserId(vehicle);
  return trips.filter(
    (t) =>
      t.vehicleDocumentId === vehicle.driverID ||
      (chauffeurId != null && t.driverID === chauffeurId)
  );
}

export function vehicleProfileCompleteness(vehicle: Vehicle): number {
  const registration = vehicle.registration;
  const details = vehicle.details;
  const policies = vehicle.insurancePolicies ?? [];
  const hasInsurancePolicy = policies.some(
    (policy) =>
      Boolean(policy.insurerName.trim() || policy.policyReferenceNumber.trim()) &&
      Boolean(policy.policyExpiry)
  );
  const checks = [
    Boolean(details?.make?.trim()),
    Boolean(details?.model?.trim()),
    Boolean(details?.color?.trim()),
    Boolean(registration?.registrationNumber?.trim()),
    Boolean(details?.vehicleClassId),
    Boolean(details?.vehicleIdentificationNumber?.trim()),
    Boolean(registration?.registrationExpiry),
    Boolean(registration?.jurisdictionCode?.trim()),
    hasInsurancePolicy,
    Boolean(vehicle.roadworthy?.expiryDate)
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function vehicleOverviewMetrics(
  trips: Trip[],
  invoices: Invoice[],
  vehicle: Vehicle,
  now = new Date()
) {
  const vehicleTrips = tripsForVehicle(trips, vehicle);
  const tripIds = new Set(vehicleTrips.map((t) => t.id));
  const vehicleInvoices = invoicesForDriver(invoices, tripIds);

  const completed = vehicleTrips.filter((t) => t.status === "completed").length;
  const active = vehicleTrips.filter(
    (t) => t.status === "in_progress" || t.status === "en_route_pickup"
  ).length;
  const upcoming = vehicleTrips.filter(
    (t) => t.status === "requested" || t.status === "accepted"
  ).length;

  const thisMonth = getMonthRange(now, 0);
  const monthTrips = tripsInRange(vehicleTrips, thisMonth.start, thisMonth.end);
  const monthTripIds = new Set(monthTrips.map((t) => t.id));
  const monthInvoices = invoicesForDriver(invoices, monthTripIds);
  const monthRevenue = invoiceRevenueInRange(monthInvoices, thisMonth.start, thisMonth.end);
  const totalRevenue = paidRevenueForInvoices(vehicleInvoices.filter((i) => i.status === "paid"));

  return {
    totalTrips: vehicleTrips.length,
    completed,
    active,
    upcoming,
    monthRevenue,
    totalRevenue,
    vehicleTrips,
    vehicleInvoices,
    tripIds
  };
}
