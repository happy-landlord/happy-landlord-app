import type { DbPropertyInsert, RentalStatus } from "@/types";

export type PropertyDetailFormValues = {
  title: string;
  developerName: string;
  cabinetCode: string;
  lotNumber: string;
  consultantName: string;
  maaFee: string;
  defects: string;
  parkingLocation: string;
  storageLocation: string;
  bedrooms: string;
  bathrooms: string;
  carparks: string;
  notes: string;
  rentalStatus: RentalStatus;
};

type PropertyDetailColumns = Pick<
  DbPropertyInsert,
  | "title"
  | "developer_name"
  | "cabinet_code"
  | "lot_number"
  | "consultant_name"
  | "maa_fee"
  | "defects"
  | "parking_location"
  | "storage_location"
  | "bedrooms"
  | "bathrooms"
  | "carparks"
  | "notes"
  | "rental_status"
>;

function optionalText(value: string): string | null {
  return value.trim() || null;
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizePropertyIntegerInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 3);
}

export function normalizePropertyDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  const normalizedWhole = whole.slice(0, 10);
  if (decimalParts.length === 0) return normalizedWhole;
  return `${normalizedWhole || "0"}.${decimal}`;
}

/** Maps creation-form values to the nullable property detail columns. */
export function buildPropertyDetailColumns(
  property: PropertyDetailFormValues,
): PropertyDetailColumns {
  return {
    title: optionalText(property.title),
    developer_name: optionalText(property.developerName),
    cabinet_code: optionalText(property.cabinetCode),
    lot_number: optionalText(property.lotNumber),
    consultant_name: optionalText(property.consultantName),
    maa_fee: optionalNumber(property.maaFee),
    defects: optionalText(property.defects),
    parking_location: optionalText(property.parkingLocation),
    storage_location: optionalText(property.storageLocation),
    bedrooms: optionalNumber(property.bedrooms),
    bathrooms: optionalNumber(property.bathrooms),
    carparks: optionalNumber(property.carparks),
    notes: optionalText(property.notes),
    rental_status: property.rentalStatus,
  };
}
