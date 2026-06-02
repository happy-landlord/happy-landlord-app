import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import { useCreateProperty } from "@/lib/hooks";
import type { PlaceResult } from "@/components/ui";
import type { KeyType, PropertyType } from "@/types";

import { submitProperty } from "./submitProperty";
import { usePropertyCode } from "./usePropertyCode";

// ── Wizard draft shapes ──────────────────────────────────────────────────────

export type PropertyStep = {
  propertyType: PropertyType;
  selectedPlace: PlaceResult | null;
  landlordName: string;
  landlordContact: string;
  dateReceived: Date;
};

/** A single key line-item in the wizard draft. Maps to one row in `keys`. */
export type KeyEntry = {
  id: string;
  type: KeyType;
  count: number;
  /** Optional code / tag number printed on the key (e.g. "K-01"). */
  code: string | null;
  /** Custom name used when type is "other". */
  otherLabel: string | null;
};

/** A keyset draft in the wizard — becomes one row in `key_sets` on save. */
export type KeySetDraft = {
  id: string;
  name: string;
  photoUris: string[];
  /** IDs of KeyEntry items (from step 1) to include in this keyset. */
  keyIds: string[];
};

// ── Defaults & wizard steps ──────────────────────────────────────────────────

export const DEFAULT_PROPERTY: PropertyStep = {
  propertyType: "apartment",
  selectedPlace: null,
  landlordName: "",
  landlordContact: "",
  dateReceived: new Date(),
};

export const STEP_LABELS = ["Property", "Keysets", "Review"] as const;
export const TOTAL_STEPS = STEP_LABELS.length;

const NEXT_LABELS = ["Next: Keysets", "Next: Review", "Save Property"] as const;

/**
 * Encapsulates all state, navigation and submit orchestration for the
 * "create property" wizard. The screen becomes purely presentational.
 *
 * Notes on shape:
 *  - `propertyCode` is owned by `usePropertyCode` and surfaced directly here
 *    (not duplicated into `property`), avoiding the previous
 *    setState-during-render bug.
 *  - Handlers (`back`, `next`, `submit`, `exit`) return guarded actions so the
 *    screen never has to know about validation or discard-confirm rules.
 */
export function useAddPropertyWizard() {
  const router = useRouter();
  const createProperty = useCreateProperty();

  // ── Form state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [property, setProperty] = useState<PropertyStep>(DEFAULT_PROPERTY);
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [keySets, setKeySets] = useState<KeySetDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState<string | null>(null);

  // Derived: property code is generated from the selected address.
  const propertyCode = usePropertyCode(
    property.selectedPlace,
    property.propertyType,
  );

  // ── Derived UI flags ───────────────────────────────────────────────────
  const isLastStep = step === TOTAL_STEPS;
  const isSaving = submitting || createProperty.isPending;
  const nextLabel = NEXT_LABELS[step - 1];
  const hasUnsavedData =
    Boolean(property.selectedPlace) ||
    Boolean(property.landlordName) ||
    Boolean(property.landlordContact) ||
    keys.length > 0 ||
    keySets.length > 0;

  // ── Patchers ───────────────────────────────────────────────────────────
  const patchProperty = useCallback((patch: Partial<PropertyStep>) => {
    setProperty((p) => ({ ...p, ...patch }));
  }, []);

  const onAddressSelect = useCallback(
    (place: PlaceResult) => {
      propertyCode.generate(place, property.propertyType);
    },
    [propertyCode, property.propertyType],
  );

  // ── Navigation ─────────────────────────────────────────────────────────
  const confirmDiscard = useCallback((onConfirm: () => void) => {
    Alert.alert(
      "Discard changes?",
      "You have unsaved property details. Going back will lose all entered data.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onConfirm },
      ],
    );
  }, []);

  const exit = useCallback(() => {
    if (hasUnsavedData) confirmDiscard(() => router.back());
    else router.back();
  }, [hasUnsavedData, confirmDiscard, router]);

  const back = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
    else exit();
  }, [step, exit]);

  const next = useCallback(() => {
    if (step === 1 && !property.selectedPlace) {
      Alert.alert(
        "Address required",
        "Please search and select a property address.",
      );
      return;
    }
    setStep((s) => s + 1);
  }, [step, property.selectedPlace]);

  // ── Submit ─────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!propertyCode.code) {
      Alert.alert(
        "Property code missing",
        "Please wait for the property code to finish generating.",
      );
      return;
    }

    setSubmitting(true);
    const totalPhotos = keySets.reduce((s, ks) => s + ks.photoUris.length, 0);
    setSubmitLabel(
      totalPhotos > 0
        ? `Uploading ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}…`
        : "Saving…",
    );
    try {
      await submitProperty({
        property,
        propertyCode: propertyCode.code,
        keys,
        keySets,
        createProperty: createProperty.mutateAsync,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
      setSubmitLabel(null);
    }
  }, [
    property,
    propertyCode.code,
    keys,
    keySets,
    createProperty.mutateAsync,
    router,
  ]);

  return {
    // state
    step,
    property,
    keys,
    keySets,
    propertyCode,

    // derived
    isLastStep,
    isSaving,
    nextLabel,
    submitLabel,
    canGoBack: step > 1,

    // setters
    patchProperty,
    setKeys,
    setKeySets,

    // actions
    onAddressSelect,
    back,
    next,
    exit,
    submit,
  };
}
