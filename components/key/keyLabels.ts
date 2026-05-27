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

import type { KeyType } from "@/services/keys.service";

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
