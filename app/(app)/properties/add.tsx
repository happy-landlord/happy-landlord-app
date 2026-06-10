import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, X } from "lucide-react-native";

import { theme } from "@/constants";
import { StepIndicator } from "@/components/ui";
import {
  PropertyInfoStep,
  KeySetsStep,
  ReviewStep,
  STEP_LABELS,
  useAddPropertyWizard,
} from "@/components/property/add";

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AddPropertyScreen() {
  const insets = useSafeAreaInsets();
  const wizard = useAddPropertyWizard();
  const {
    step,
    property,
    keys,
    keySets,
    propertyCode,
    isLastStep,
    isSaving,
    nextLabel,
    submitLabel,
    canGoBack,
    patchProperty,
    setKeys,
    setKeySets,
    onAddressSelect,
    back,
    next,
    exit,
    submit,
  } = wizard;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Header onBack={back} onClose={exit} canGoBack={canGoBack} />

      <StepIndicator steps={STEP_LABELS} current={step} />
      <View style={styles.divider} />

      <KeyboardAwareScrollView
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
            onAddressSelect={onAddressSelect}
            keys={keys}
            onKeysChange={setKeys}
          />
        )}
        {step === 2 && (
          <KeySetsStep
            keySets={keySets}
            keys={keys}
            propertyCode={propertyCode.code}
            codeLoading={propertyCode.loading}
            onChange={setKeySets}
          />
        )}
        {step === 3 && (
          <ReviewStep propertyData={property} keys={keys} keySets={keySets} />
        )}
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
          onPress={isLastStep ? submit : next}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
        >
          {isSaving ? (
            <>
              <ActivityIndicator
                color={theme.colors.accent}
                size="small"
              />
              {submitLabel ? (
                <Text
                  style={[styles.footerBtnLabel, styles.footerBtnSavingLabel]}
                >
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

// ── Header sub-component ─────────────────────────────────────────────────────

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
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && styles.iconBtnPressed,
        ]}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={canGoBack ? "Back" : "Cancel"}
      >
        <ChevronLeft size={22} color={theme.colors.text} strokeWidth={2} />
      </Pressable>
      <View style={styles.headerSpacer} />
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && styles.iconBtnPressed,
        ]}
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      >
        <X size={18} color={theme.colors.text} strokeWidth={2.2} />
      </Pressable>
    </View>
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
    shadowColor: theme.colors.accent,
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
    color: theme.colors.accent,
    letterSpacing: 0.2,
  },
  footerBtnSavingLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
});
