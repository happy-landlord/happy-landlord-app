import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { PropertyInfoStep } from "@/components/property/add/PropertyInfoStep";
import { KeysStep } from "@/components/property/add/KeysStep";
import { ReviewStep } from "@/components/property/add/ReviewStep";
import {
  DEFAULT_PROPERTY,
  STEP_LABELS,
  TOTAL_STEPS,
  type KeyEntry,
  type KeySetDraft,
  type PropertyStep,
} from "@/components/property/add/types";
import { usePropertyCode } from "@/components/property/add/usePropertyCode";
import { submitNewProperty } from "@/components/property/add/submit";
import { useCreateProperty } from "@/hooks/useProperties";

// ── Constants ────────────────────────────────────────────────────────────────

const NEXT_LABELS = ["Next: Keysets", "Next: Review", "Save Property"] as const;

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AddPropertyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createProperty = useCreateProperty();
  const scrollViewRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);
  const [property, setProperty] = useState<PropertyStep>(DEFAULT_PROPERTY);
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [keySets, setKeySets] = useState<KeySetDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState<string | null>(null);

  const propertyCode = usePropertyCode(
    property.selectedPlace,
    property.propertyType,
  );

  // Mirror the derived property code into `property` so child steps see one
  // consistent source of truth.
  if (property.propertyCode !== propertyCode.code) {
    setProperty((p) => ({ ...p, propertyCode: propertyCode.code }));
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const isLastStep = step === TOTAL_STEPS;
  const isSaving = submitting || createProperty.isPending;
  const nextLabel = NEXT_LABELS[step - 1];

  const hasUnsavedData =
    Boolean(property.selectedPlace) ||
    Boolean(property.landlordName) ||
    Boolean(property.landlordContact) ||
    keys.length > 0 ||
    keySets.length > 0;

  // ── Navigation ─────────────────────────────────────────────────────────────

  function patchProperty(patch: Partial<PropertyStep>) {
    setProperty((p) => ({ ...p, ...patch }));
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

  function exitWizard() {
    if (hasUnsavedData) confirmDiscard(() => router.back());
    else router.back();
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
    else exitWizard();
  }

  function handleNext() {
    if (step === 1 && !property.selectedPlace) {
      Alert.alert(
        "Address required",
        "Please search and select a property address.",
      );
      return;
    }
    setStep((s) => s + 1);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    const totalPhotos = keySets.reduce((sum, ks) => sum + ks.photoUris.length, 0);
    setSubmitLabel(
      totalPhotos > 0
        ? `Uploading ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}…`
        : "Saving…",
    );
    try {
      await submitNewProperty({
        property,
        keys,
        keySets,
        createProperty: createProperty.mutateAsync,
      });
      Alert.alert(
        "Property Created",
        "The property has been added successfully.",
        [{ text: "OK", onPress: () => router.back() }],
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
      setSubmitLabel(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Header onBack={handleBack} onClose={exitWizard} canGoBack={step > 1} />

      <StepIndicator steps={STEP_LABELS} current={step} />
      <View style={styles.divider} />

      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={Platform.OS === "ios" ? 32 : 16}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <PropertyInfoStep
            data={property}
            onChange={patchProperty}
            onAddressSelect={(place) =>
              propertyCode.generate(place, property.propertyType)
            }
            keys={keys}
            onKeysChange={setKeys}
          />
        )}
        {step === 2 && (
          <KeysStep
            keySets={keySets}
            keys={keys}
            propertyCode={property.propertyCode}
            codeLoading={propertyCode.loading}
            onChange={setKeySets}
          />
        )}
        {step === 3 && <ReviewStep propertyData={property} keys={keys} keySets={keySets} />}
      </KeyboardAwareScrollView>

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
          {isSaving ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              {submitLabel ? (
                <Text style={[styles.footerBtnLabel, styles.footerBtnSavingLabel]}>
                  {submitLabel}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.footerBtnLabel}>{nextLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Header({
  onBack,
  onClose,
  canGoBack,
}: {
  onBack: () => void;
  onClose: () => void;
  canGoBack: boolean;
}) {
  return (
    <View style={styles.header}>
      <IconButton
        onPress={onBack}
        label={canGoBack ? "Back" : "Cancel"}
        icon={<ChevronLeft size={22} color={theme.colors.text} strokeWidth={2} />}
      />
      <View style={styles.headerSpacer} />
      <IconButton
        onPress={onClose}
        label="Cancel"
        icon={<X size={18} color={theme.colors.text} strokeWidth={2.2} />}
      />
    </View>
  );
}

function IconButton({
  onPress,
  label,
  icon,
}: {
  onPress: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.iconBtnPressed,
      ]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  headerSpacer: { flex: 1 },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  iconBtnPressed: { opacity: 0.65 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  footer: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  footerBtn: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  footerBtnPressed: { opacity: 0.82 },
  footerBtnDisabled: { opacity: 0.5 },
  footerBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  footerBtnSavingLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
});
