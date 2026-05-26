import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { StepIndicator } from "@/components/ui/StepIndicator";
import {
  PropertyInfoStep,
  type PropertyInfoStepRef,
} from "@/components/property/add/PropertyInfoStep";
import { KeysetsStep } from "@/components/property/add/KeysetsStep";
import { ReviewStep } from "@/components/property/add/ReviewStep";
import {
  DEFAULT_PROPERTY,
  STEP_LABELS,
  TOTAL_STEPS,
  type KeySetDraft,
  type PropertyStep,
} from "@/components/property/add/types";
import {
  fetchNextPropertyCodeSeq,
  makeKeySetCode,
  makePropertyCode,
  KEYSET_TYPE_LETTERS,
  PROPERTY_TYPE_LETTERS,
} from "@/services/properties.service";
import { useCreateProperty } from "@/hooks/useProperties";
import { useCreateKeySets } from "@/hooks/useKeySets";
import type { PlaceResult } from "@/components/ui/AddressSearch";
import type { DbKeySetInsert } from "@/types/database";

export default function AddPropertyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [propertyData, setPropertyData] =
    useState<PropertyStep>(DEFAULT_PROPERTY);
  const [keySets, setKeySets] = useState<KeySetDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  const createProperty = useCreateProperty();
  const createKeySets = useCreateKeySets("");
  const propertyStepRef = useRef<PropertyInfoStepRef>(null);

  // Stable ref so handleAddressSelect can read fresh state from async callbacks
  const setPropertyDataRef = useRef(setPropertyData);
  setPropertyDataRef.current = setPropertyData;

  // ── Address selection & code generation ────────────────────────────────────

  async function handleAddressSelect(place: PlaceResult) {
    setPropertyDataRef.current((d) => ({
      ...d,
      selectedPlace: place,
      propertyCode: null,
    }));
    setCodeLoading(true);
    try {
      const council = place.council ?? place.suburb ?? "";
      const suburb = place.suburb ?? "";
      const seq = await fetchNextPropertyCodeSeq(council, suburb);
      setPropertyDataRef.current((d) => ({
        ...d,
        propertyCode: makePropertyCode(council, suburb, d.propertyType, seq),
      }));
    } catch {
      setPropertyDataRef.current((d) => ({ ...d, propertyCode: null }));
    } finally {
      setCodeLoading(false);
    }
  }

  // Sync the property-type letter in the code when propertyType changes after an address is set.
  // Format: {COUN}-{SUB}-{TYPE}{SEQ3} — only the leading char of part[2] changes.
  useEffect(() => {
    setPropertyData((d) => {
      if (!d.selectedPlace || !d.propertyCode) return d;
      const parts = d.propertyCode.split("-");
      if (parts.length !== 3) return d;
      const seq = parts[2].slice(1); // strip type letter, keep "001"
      const newLetter = PROPERTY_TYPE_LETTERS[d.propertyType] ?? "O";
      const newPart = `${newLetter}${seq}`;
      if (parts[2] === newPart) return d;
      return { ...d, propertyCode: `${parts[0]}-${parts[1]}-${newPart}` };
    });
  }, [propertyData.propertyType]);

  // ── Wizard navigation ──────────────────────────────────────────────────────

  /** True when the user has entered anything worth warning about before discarding. */
  function hasUnsavedData() {
    return (
      !!propertyData.selectedPlace ||
      !!propertyData.landlordName ||
      !!propertyData.landlordContact ||
      propertyData.photoUris.length > 0 ||
      keySets.length > 0
    );
  }

  function confirmDiscard(onConfirm: () => void) {
    Alert.alert(
      "Discard changes?",
      "You have unsaved property details. Going back will lose all entered data.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onConfirm },
      ],
    );
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
    } else if (hasUnsavedData()) {
      confirmDiscard(() => router.back());
    } else {
      router.back();
    }
  }

  function handleClose() {
    if (hasUnsavedData()) {
      confirmDiscard(() => router.back());
    } else {
      router.back();
    }
  }

  function handleNext() {
    if (step === 1) {
      if (!propertyData.selectedPlace) {
        Alert.alert(
          "Address required",
          "Please search and select a property address.",
        );
        return;
      }
    }
    if (step === 2) {
      const invalidSets = keySets.filter(
        (ks) =>
          (ks.setType === "company" || ks.setType === "tenant") &&
          ks.keys.length === 0,
      );
      if (invalidSets.length > 0) {
        const names = invalidSets.map((ks) => ks.label).join(", ");
        Alert.alert(
          "Keys required",
          `The following sets have no keys added: ${names}. Please add at least one key to each Company or Tenant set before continuing.`,
          [{ text: "OK" }],
        );
        return;
      }

      const tenantMissingContact = keySets.filter(
        (ks) => ks.setType === "tenant" && !!ks.tenantName && !ks.tenantContact,
      );
      if (tenantMissingContact.length > 0) {
        Alert.alert(
          "Tenant contact required",
          "A tenant name has been added but no contact details provided. Please add a phone number or email for the tenant.",
          [{ text: "OK" }],
        );
        return;
      }
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const place = propertyData.selectedPlace;
    if (!place || !propertyData.propertyCode) return;

    setSubmitting(true);
    try {
      // 1. Build street address from place parts
      const streetAddress =
        [place.streetNumber, place.street].filter(Boolean).join(" ") ||
        place.description;

      // 2. Create the property
      // TODO: upload propertyData.photoUris to Supabase Storage and store returned URLs
      const property = await createProperty.mutateAsync({
        property_code: propertyData.propertyCode,
        address: streetAddress,
        unit_number: null,
        suburb: place.suburb ?? "",
        city: place.suburb ?? place.state ?? "",
        postcode: place.postcode ?? null,
        formatted_address: place.description,
        google_place_id: place.placeId,
        latitude: place.lat ?? null,
        longitude: place.lng ?? null,
        property_type: propertyData.propertyType,
        landlord_name: propertyData.landlordName || null,
        landlord_contact: propertyData.landlordContact || null,
        landlord_key_delivery_date: propertyData.dateReceived.toISOString(),
        key_status: "available",
        status: "active",
      });

      // 3. Map each keyset draft to a DB insert row
      // TODO: upload per-keyset photoUris to Supabase Storage and store returned URLs
      const keySetInserts: DbKeySetInsert[] = keySets.map((ks) => {
        const setCode = makeKeySetCode(
          property.property_code,
          ks.setType as keyof typeof KEYSET_TYPE_LETTERS,
        );
        const status: DbKeySetInsert["status"] =
          ks.setType === "tenant" && (ks.tenantName || ks.tenantContact)
            ? "tenant"
            : "available";

        return {
          property_id: property.id,
          set_code: setCode,
          set_type: ks.setType,
          status,
          inventory: {
            items: ks.keys.map((k) => ({
              type: k.type,
              code: k.id,
              count: k.count,
            })),
          },
          notes: ks.notes || null,
        };
      });

      // 4. Insert all keysets in one request
      await createKeySets.mutateAsync(keySetInserts);

      Alert.alert(
        "Property Created",
        "The property has been added successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              propertyStepRef.current?.clearAddress();
              router.back();
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === TOTAL_STEPS;
  const isSaving =
    submitting || createProperty.isPending || createKeySets.isPending;
  const nextLabel =
    step === 1 ? "Next: Keysets" : step === 2 ? "Next: Review" : "Save Keysets";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.iconBtnPressed,
          ]}
          onPress={handleBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={step > 1 ? "Back" : "Cancel"}
        >
          <ChevronLeft size={22} color={theme.colors.text} strokeWidth={2} />
        </Pressable>

        <View style={styles.headerTitlePlaceholder} />

        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.iconBtnPressed,
          ]}
          onPress={handleClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <X size={18} color={theme.colors.text} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Step progress */}
      <StepIndicator steps={STEP_LABELS} current={step} />
      <View style={styles.divider} />

      {/* Step content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <PropertyInfoStep
            ref={propertyStepRef}
            data={propertyData}
            onChange={(patch) => setPropertyData((d) => ({ ...d, ...patch }))}
            codeLoading={codeLoading}
            onAddressSelect={handleAddressSelect}
          />
        )}
        {step === 2 && (
          <KeysetsStep
            keySets={keySets}
            onChange={setKeySets}
            propertyCode={propertyData.propertyCode ?? undefined}
          />
        )}
        {step === 3 && (
          <ReviewStep propertyData={propertyData} keySets={keySets} />
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.footerBtn,
            pressed && styles.footerBtnPressed,
            isSaving && styles.footerBtnDisabled,
          ]}
          onPress={isLastStep ? handleSubmit : handleNext}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.footerBtnLabel}>{nextLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  headerTitlePlaceholder: {
    flex: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  iconBtnPressed: { opacity: 0.65 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  footer: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  footerBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  footerBtnPressed: {
    opacity: 0.82,
  },
  footerBtnDisabled: {
    opacity: 0.5,
  },
  footerBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
