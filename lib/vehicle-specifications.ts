/** Prefill options for vehicle specification fields in fleet UI. */

export const VEHICLE_ENGINE_TYPES = [
  "Petrol",
  "Diesel",
  "Hybrid",
  "Plug-in Hybrid",
  "Mild Hybrid",
  "Electric",
  "Hydrogen"
] as const;

export const VEHICLE_TRANSMISSIONS = [
  "Automatic",
  "Manual",
  "CVT",
  "Dual-clutch",
  "Semi-automatic"
] as const;

export const VEHICLE_ENGINE_TYPE_OPTIONS = VEHICLE_ENGINE_TYPES.map((value) => ({
  value,
  label: value
}));

export const VEHICLE_TRANSMISSION_OPTIONS = VEHICLE_TRANSMISSIONS.map((value) => ({
  value,
  label: value
}));
