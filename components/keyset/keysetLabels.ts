import type { ComponentType } from "react";
import {
  AppWindow,
  CreditCard,
  Key,
  KeyRound,
  Layers,
  Mail,
  Nfc,
  Radio,
} from "lucide-react-native";

import type { KeyItemType } from "@/services/keys.service";

/** Default loan window applied when an agent checks out a company keyset. */
export const CHECKOUT_DURATION_HOURS = 24;

export const ITEM_TYPE_LABEL: Record<KeyItemType, string> = {
  main_door: "Door",
  mailbox: "Mailbox",
  swipe_fob: "Fob",
  garage_remote: "Remote",
  key_card: "Card",
  window: "Window",
  balcony: "Balcony",
};

type LucideIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export const ITEM_TYPE_ICON: Record<KeyItemType, LucideIcon> = {
  main_door:     Key,
  mailbox:       Mail,
  swipe_fob:     Nfc,
  garage_remote: Radio,
  key_card:      CreditCard,
  window:        AppWindow,
  balcony:       Layers,
};

export const FALLBACK_ITEM_ICON: LucideIcon = KeyRound;

