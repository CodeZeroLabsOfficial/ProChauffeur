/** Luxury vehicle makes supported in fleet UI with matching avatar logos. */
export const LUXURY_VEHICLE_MAKES = [
  { id: "audi", label: "Audi" },
  { id: "bmw", label: "BMW" },
  { id: "mercedes-benz", label: "Mercedes-Benz" },
  { id: "lexus", label: "Lexus" },
  { id: "porsche", label: "Porsche" },
  { id: "land-rover", label: "Land Rover" },
  { id: "bentley", label: "Bentley" },
  { id: "rolls-royce", label: "Rolls-Royce" },
  { id: "jaguar", label: "Jaguar" },
  { id: "maserati", label: "Maserati" },
  { id: "tesla", label: "Tesla" },
  { id: "other", label: "Other" }
] as const;

export type VehicleMakeId = (typeof LUXURY_VEHICLE_MAKES)[number]["id"];

const MAKE_LABEL_BY_ID = Object.fromEntries(
  LUXURY_VEHICLE_MAKES.map((make) => [make.id, make.label])
) as Record<VehicleMakeId, string>;

const MAKE_ID_ALIASES: Record<string, VehicleMakeId> = {
  audi: "audi",
  bmw: "bmw",
  mercedes: "mercedes-benz",
  "mercedes-benz": "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  lexus: "lexus",
  porsche: "porsche",
  "land rover": "land-rover",
  landrover: "land-rover",
  "range rover": "land-rover",
  bentley: "bentley",
  "rolls-royce": "rolls-royce",
  "rolls royce": "rolls-royce",
  jaguar: "jaguar",
  maserati: "maserati",
  tesla: "tesla",
  other: "other"
};

/** Resolves a stored make string to a known make id (for logos and dropdown). */
export function resolveVehicleMakeId(make: string | null | undefined): VehicleMakeId | null {
  const trimmed = make?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();
  if (MAKE_ID_ALIASES[normalized]) return MAKE_ID_ALIASES[normalized];

  const byLabel = LUXURY_VEHICLE_MAKES.find(
    (entry) => entry.label.toLowerCase() === normalized
  );
  return byLabel?.id ?? null;
}

/** Display label for a make string or id. */
export function vehicleMakeLabel(make: string | null | undefined): string {
  const trimmed = make?.trim();
  if (!trimmed) return "—";

  const id = resolveVehicleMakeId(trimmed);
  if (id) return MAKE_LABEL_BY_ID[id];

  return trimmed;
}

/** Value for the make dropdown from a stored make string. */
export function vehicleMakeSelectValue(make: string | null | undefined): string {
  if (!make?.trim()) return "";
  const id = resolveVehicleMakeId(make);
  if (id) return MAKE_LABEL_BY_ID[id];
  return MAKE_LABEL_BY_ID.other;
}

/** File extension per make logo (defaults to svg). */
const MAKE_LOGO_EXTENSION: Partial<Record<VehicleMakeId, "svg" | "png">> = {
  audi: "png",
  bmw: "png",
  "mercedes-benz": "png"
};

/** Public URL for a make avatar logo, or undefined for unknown / Other. */
export function vehicleMakeLogoUrl(make: string | null | undefined): string | undefined {
  const id = resolveVehicleMakeId(make);
  if (!id || id === "other") return undefined;
  const ext = MAKE_LOGO_EXTENSION[id] ?? "svg";
  // Source files: assets/vehicles/makes/ — served via public/assets/vehicles/makes/
  return `/assets/vehicles/makes/${id}.${ext}`;
}
