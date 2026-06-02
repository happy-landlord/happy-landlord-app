/**
 * Canonical icon / label / short-code tables for every `KeyType`.
 *
 * Lives in `@/constants` because these are domain config consumed by many
 * feature areas (property add wizard, keyset edit sheet, keyset detail,
 * activity rows, …). Keeping them under a single component folder would
 * couple unrelated screens to that folder.
 */
import type { ComponentType } from "react";
import {
  AppWindow,
  CreditCard,
  Key,
  KeyRound,
  Layers,
  Lock,
  Mail,
  Nfc,
  Radio,
  Shield,
  Warehouse,
} from "lucide-react-native";

import type { KeyType } from "@/types";

export type LucideIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export const KEY_TYPE_ICON: Record<KeyType, LucideIcon> = {
  main_door: Key,
  swipe_fob: Nfc,
  mailbox: Mail,
  window: AppWindow,
  garage_remote: Radio,
  key_card: CreditCard,
  storage_cage: Warehouse,
  common_area: Lock,
  security: Shield,
  balcony: Layers,
  other: KeyRound,
};

export const KEY_TYPE_LABEL: Record<KeyType, string> = {
  main_door: "Door Key",
  swipe_fob: "Swipe Fob",
  mailbox: "Mailbox Key",
  window: "Window Key",
  garage_remote: "Garage Remote",
  key_card: "Key Card",
  storage_cage: "Storage Cage",
  common_area: "Common Area",
  security: "Security Key",
  balcony: "Balcony Key",
  other: "Other Key",
};

/** 2-letter suffix used when building per-key `key_code` strings. */
export const KEY_TYPE_SHORT: Record<KeyType, string> = {
  main_door: "MD",
  swipe_fob: "SF",
  mailbox: "MB",
  window: "WN",
  garage_remote: "GR",
  key_card: "KC",
  storage_cage: "SC",
  common_area: "CA",
  security: "SY",
  balcony: "BL",
  other: "OT",
};

