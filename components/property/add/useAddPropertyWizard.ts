import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useCreateProperty,
  usePropertyDraft,
  useSavePropertyDraft,
} from "@/lib/hooks";
import { uploadPropertyDraftPhoto } from "@/lib/services";
import {
  buildAddressColumns,
  deduplicateKeyEntries,
  showSuccessToast,
} from "@/lib/utils";
import type { PlaceResult } from "@/components/ui";
import type { KeyType, PropertyType, RentalStatus } from "@/types";

import { useAddressDuplicateCheck } from "../useAddressDuplicateCheck";
import { submitProperty } from "./submitProperty";
import { restorePropertyDraft, serializePropertyDraft } from "./propertyDraft";
import { buildPropertyDetailColumns } from "./propertyForm";
import { usePropertyCode } from "./usePropertyCode";

// ── Wizard draft shapes ──────────────────────────────────────────────────────

export type PropertyStep = {
  propertyType: PropertyType;
  selectedPlace: PlaceResult | null;
  title: string;
  landlordName: string;
  landlordContact: string;
  dateReceived: Date;
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
  /** Durable draft-storage path aligned with each photo URI; null until saved. */
  photoPaths: (string | null)[];
  /** IDs of KeyEntry items (from the Keys step) to include in this keyset. */
  keyIds: string[];
  /** Optional cabinet slot for this keyset (maps to key_sets.cabinet_slot). */
  cabinetSlot: string | null;
};

// ── Defaults & wizard steps ──────────────────────────────────────────────────

export const DEFAULT_PROPERTY: PropertyStep = {
  propertyType: "apartment",
  selectedPlace: null,
  title: "",
  landlordName: "",
  landlordContact: "",
  dateReceived: new Date(),
  developerName: "",
  cabinetCode: "",
  lotNumber: "",
  consultantName: "",
  maaFee: "",
  defects: "",
  parkingLocation: "",
  storageLocation: "",
  bedrooms: "",
  bathrooms: "",
  carparks: "",
  notes: "",
  rentalStatus: "long",
};

export const STEP_LABELS = ["Property", "Keys", "Keysets", "Review"] as const;
export const TOTAL_STEPS = STEP_LABELS.length;

const NEXT_LABELS = [
  "Next: Keys",
  "Next: Keysets",
  "Next: Review",
  "Save Property",
] as const;

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
  const { draftId: routeDraftId } = useLocalSearchParams<{
    draftId?: string;
  }>();
  const createProperty = useCreateProperty();
  const saveDraftMutation = useSavePropertyDraft();
  const draftQuery = usePropertyDraft(routeDraftId ?? "");
  const hydratedDraftId = useRef<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [property, setProperty] = useState<PropertyStep>(DEFAULT_PROPERTY);
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [keySets, setKeySets] = useState<KeySetDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(routeDraftId);
  const [isHydratingDraft, setIsHydratingDraft] = useState(
    Boolean(routeDraftId),
  );

  // Derived: property code is generated from the selected address + developer name.
  // When developerName is blank, the property-type letter is used as fallback.
  const propertyCode = usePropertyCode(
    property.selectedPlace,
    property.developerName,
    property.propertyType,
  );
  const restorePropertyCode = propertyCode.restore;

  // ── Address duplicate-check (shared with edit flow) ────────────────────
  const { addressError, addressChecking, onAddressSelect, clearAddress } =
    useAddressDuplicateCheck({
      excludePropertyId: draftId,
      onSelect: propertyCode.generate,
    });

  useEffect(() => {
    const draft = draftQuery.data;
    if (!routeDraftId) return;
    if (draftQuery.isError || (draftQuery.isSuccess && !draft)) {
      return;
    }
    if (!draft || hydratedDraftId.current === draft.id) return;

    let active = true;
    restorePropertyDraft(draft)
      .then((restored) => {
        if (!active) return;
        setProperty(restored.property);
        setKeys(restored.keys);
        setKeySets(restored.keySets);
        setStep(restored.step);
        setDraftId(draft.id);
        hydratedDraftId.current = draft.id;
        if (restored.property.selectedPlace) {
          restorePropertyCode(draft.property_code);
          void onAddressSelect(restored.property.selectedPlace, false);
        }
      })
      .catch((error) => {
        if (!active) return;
        Alert.alert(
          "Couldn't open draft",
          error instanceof Error
            ? error.message
            : "The draft could not be loaded.",
          [{ text: "Close", onPress: () => router.back() }],
        );
      })
      .finally(() => {
        if (active) setIsHydratingDraft(false);
      });

    return () => {
      active = false;
    };
  }, [
    draftQuery.data,
    draftQuery.isError,
    draftQuery.isSuccess,
    onAddressSelect,
    restorePropertyCode,
    routeDraftId,
    router,
  ]);

  // ── Derived UI flags ───────────────────────────────────────────────────
  const isLastStep = step === TOTAL_STEPS;
  const isSaving =
    submitting || createProperty.isPending || saveDraftMutation.isPending;
  const nextLabel = NEXT_LABELS[step - 1];
  const hasUnsavedData =
    Boolean(property.selectedPlace) ||
    Boolean(property.landlordName) ||
    Boolean(property.landlordContact) ||
    Boolean(property.title) ||
    Boolean(property.developerName) ||
    Boolean(property.cabinetCode) ||
    Boolean(property.lotNumber) ||
    Boolean(property.consultantName) ||
    Boolean(property.maaFee) ||
    Boolean(property.defects) ||
    Boolean(property.parkingLocation) ||
    Boolean(property.storageLocation) ||
    Boolean(property.bedrooms) ||
    Boolean(property.bathrooms) ||
    Boolean(property.carparks) ||
    Boolean(property.notes) ||
    Boolean(property.rentalStatus) ||
    keys.length > 0 ||
    keySets.length > 0;

  // ── Patchers ───────────────────────────────────────────────────────────
  const patchProperty = useCallback((patch: Partial<PropertyStep>) => {
    setProperty((p) => ({ ...p, ...patch }));
  }, []);

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
    if (step === 1) {
      if (!property.selectedPlace) {
        Alert.alert(
          "Address required",
          "Please search and select a property address.",
        );
        return;
      }
      if (addressError) {
        Alert.alert("Duplicate address", addressError);
        return;
      }
    }
    if (step === 2 && keys.length === 0) {
      Alert.alert(
        "No keys added",
        "Please add at least one key before continuing.",
      );
      return;
    }
    // Merge duplicate key entries before leaving the Keys step.
    if (step === 2) {
      setKeys(deduplicateKeyEntries(keys));
    }
    if (step === 3) {
      if (keySets.length === 0) {
        Alert.alert(
          "No keysets added",
          "Please add at least one keyset before continuing.",
        );
        return;
      }
      if (keySets.some((ks) => !ks.name.trim())) {
        Alert.alert(
          "Keyset name required",
          "Every keyset needs a name. Please name or remove any blank keysets.",
        );
        return;
      }
    }
    setStep((s) => s + 1);
  }, [step, property.selectedPlace, addressError, keys, keySets]);

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
        draftPropertyId: draftId,
      });
      showSuccessToast("Property created");
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
    draftId,
    router,
  ]);

  const saveDraft = useCallback(async () => {
    const place = property.selectedPlace;
    if (!place || !propertyCode.code) {
      Alert.alert(
        "Address required",
        "Select the property address before saving a draft.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitLabel("Saving draft…");
    let snapshotSaved = false;
    try {
      const initial = await saveDraftMutation.mutateAsync({
        draftId,
        input: {
          property_code: propertyCode.code,
          ...buildAddressColumns(place),
          ...buildPropertyDetailColumns(property),
          property_type: property.propertyType,
          landlord_holder_id: null,
          status: "draft",
          images: [],
          draft_data: serializePropertyDraft(property, keys, keySets, step),
        },
      });
      snapshotSaved = true;
      setDraftId(initial.id);

      const persistedKeySets = await Promise.all(
        keySets.map(async (keySet) => {
          const photoPaths = await Promise.all(
            keySet.photoUris.map((uri, index) => {
              const existingPath = keySet.photoPaths[index];
              return existingPath
                ? Promise.resolve(existingPath)
                : uploadPropertyDraftPhoto(initial.id, keySet.id, uri);
            }),
          );
          return { ...keySet, photoPaths };
        }),
      );

      await saveDraftMutation.mutateAsync({
        draftId: initial.id,
        input: {
          property_code: propertyCode.code,
          ...buildAddressColumns(place),
          ...buildPropertyDetailColumns(property),
          property_type: property.propertyType,
          landlord_holder_id: null,
          status: "draft",
          images: [],
          draft_data: serializePropertyDraft(
            property,
            keys,
            persistedKeySets,
            step,
          ),
        },
      });
      setKeySets(persistedKeySets);
      showSuccessToast("Draft saved");
      router.back();
    } catch (err) {
      Alert.alert(
        snapshotSaved
          ? "Draft saved without all photos"
          : "Couldn't save draft",
        snapshotSaved
          ? "Your form details are safe, but one or more photos could not be uploaded. Keep editing and try saving again."
          : err instanceof Error
            ? err.message
            : "Please try again.",
      );
    } finally {
      setSubmitting(false);
      setSubmitLabel(null);
    }
  }, [
    draftId,
    keySets,
    keys,
    property,
    propertyCode.code,
    router,
    saveDraftMutation,
    step,
  ]);

  return {
    // state
    step,
    property,
    keys,
    keySets,
    propertyCode,
    addressError,
    addressChecking,

    // derived
    isLastStep,
    isSaving,
    nextLabel,
    submitLabel,
    isSavingDraft: submitLabel === "Saving draft…",
    isDraftError:
      Boolean(routeDraftId) &&
      (draftQuery.isError || (draftQuery.isSuccess && !draftQuery.data)),
    isDraftLoading:
      Boolean(routeDraftId) &&
      !(draftQuery.isError || (draftQuery.isSuccess && !draftQuery.data)) &&
      (draftQuery.isLoading || isHydratingDraft),
    retryDraft: draftQuery.refetch,
    canGoBack: step > 1,

    // setters
    patchProperty,
    setKeys,
    setKeySets,

    // actions
    onAddressSelect,
    clearAddress,
    back,
    next,
    exit,
    submit,
    saveDraft,
  };
}
