import type { Vehicle } from "@/lib/models";
import { upsertVehicle } from "@/lib/services/firebase-service";

export function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export async function saveVehicleFields(
  vehicle: Vehicle,
  patch: Partial<Vehicle>
): Promise<{ ok: boolean; message?: string }> {
  try {
    await upsertVehicle({ ...vehicle, ...patch });
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not save." };
  }
}
