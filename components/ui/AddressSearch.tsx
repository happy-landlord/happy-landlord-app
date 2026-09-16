import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import { Search } from "lucide-react-native";
import { useDebouncedCallback } from "use-debounce";

import { FEATURES, SYDNEY_BIAS, theme } from "@/constants";
import {
  logger,
  parseGooglePlace,
  plainTextAddress,
  type GooglePlaceDetails,
  type ParsedAddress,
} from "@/lib/utils";

import { Input } from "./Input";
import { OutlinedSelect } from "./OutlinedField";
import { PickerModal } from "./PickerModal";

type AustralianState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

const AUSTRALIAN_STATE_OPTIONS: {
  value: AustralianState;
  label: string;
}[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

/**
 * @deprecated Use `ParsedAddress` from `@/lib/utils`. Re-exported here so
 * existing `import { PlaceResult } from "@/components/ui"` call sites keep
 * working — the canonical definition now lives in the address module.
 */
export type PlaceResult = ParsedAddress;

type AddressSearchProps = {
  onSelect: (place: PlaceResult) => void;
  onManualClear?: () => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  /** Pre-fill the text input with this value (e.g. current address when editing). */
  initialValue?: string;
  /** Background colour of the floating label pill — should match the parent surface. */
  labelBackground?: string;
  /** Optional style for the outer field container. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Remove the component's own border/radius so it can sit inside another field shell. */
  borderless?: boolean;
  /** Show the search icon in the field. Defaults to true for unlabelled search bars and false for labelled form fields. */
  showIcon?: boolean;
  /**
   * Controls how broad the autocomplete results are.
   * - "full"    → "address" type — only returns full street addresses (street number required).
   * - "partial" → "geocode" type (default) — returns full addresses, partial streets,
   *               suburbs and localities.
   */
  mode?: "full" | "partial";
  /** Allow property forms to switch from Places search to structured manual entry. */
  allowManualEntry?: boolean;
};

export type AddressSearchRef = {
  clear: () => void;
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

const DISABLE_LIST_SCROLL = {
  flatListProps: { scrollEnabled: false },
} as unknown as object;

export const AddressSearch = forwardRef<AddressSearchRef, AddressSearchProps>(
  function AddressSearch(
    {
      onSelect,
      onManualClear,
      placeholder = "Search address…",
      label,
      required,
      initialValue,
      labelBackground,
      containerStyle,
      borderless = false,
      showIcon,
      mode = "partial",
      allowManualEntry = false,
    },
    ref,
  ) {
    const [text, setText] = useState(initialValue ?? "");
    const [focused, setFocused] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualUnit, setManualUnit] = useState("");
    const [manualStreet, setManualStreet] = useState("");
    const [manualSuburb, setManualSuburb] = useState("");
    const [manualState, setManualState] = useState<AustralianState>("NSW");
    const [manualPostcode, setManualPostcode] = useState("");
    const [showStatePicker, setShowStatePicker] = useState(false);
    const placesRef = useRef<GooglePlacesAutocompleteRef>(null);
    const onSelectRef = useRef(onSelect);
    const onManualClearRef = useRef(onManualClear);

    const iconVisible = showIcon ?? !label;
    const iconColor = focused ? theme.colors.accent : theme.colors.textLight;

    // Pre-fill the Google Places input with the initial value after mount
    useEffect(() => {
      if (initialValue && placesRef.current) {
        placesRef.current.setAddressText(initialValue);
      }
    }, [initialValue]);

    useEffect(() => {
      onSelectRef.current = onSelect;
      onManualClearRef.current = onManualClear;
    }, [onManualClear, onSelect]);

    useEffect(() => {
      if (!manualMode) return;

      onManualClearRef.current?.();

      const unitNumber = manualUnit
        .trim()
        .replace(/^unit\s*/i, "")
        .trim();
      const street = manualStreet.trim();
      const suburb = manualSuburb.trim();
      const state = manualState.trim().toUpperCase();
      const postcode = manualPostcode.trim();
      if (!street || !suburb || !state || postcode.length !== 4) return;

      const timer = setTimeout(() => {
        onSelectRef.current({
          placeId: "",
          description: [
            unitNumber ? `Unit ${unitNumber}` : null,
            street,
            suburb,
            state,
            postcode,
          ]
            .filter(Boolean)
            .join(", "),
          unitNumber: unitNumber || undefined,
          street,
          suburb,
          state,
          postcode,
          country: "Australia",
        });
      }, 350);

      return () => clearTimeout(timer);
    }, [
      manualMode,
      manualPostcode,
      manualState,
      manualStreet,
      manualSuburb,
      manualUnit,
    ]);

    const debouncedFallbackSelect = useDebouncedCallback((raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      onSelect(plainTextAddress(trimmed));
    }, 400);

    useImperativeHandle(ref, () => ({
      clear: () => {
        setManualMode(false);
        setManualUnit("");
        setManualStreet("");
        setManualSuburb("");
        setManualState("NSW");
        setManualPostcode("");
        setShowStatePicker(false);
        if (FEATURES.GOOGLE_PLACES) {
          placesRef.current?.clear();
        } else {
          setText("");
        }
      },
    }));

    const handleFallbackSubmit = () => {
      debouncedFallbackSelect.cancel();
      const trimmed = text.trim();
      if (!trimmed) return;
      onSelect(plainTextAddress(trimmed));
    };

    const field = FEATURES.GOOGLE_PLACES ? (
      <GooglePlacesAutocomplete
        ref={placesRef}
        placeholder={placeholder}
        fetchDetails
        debounce={400}
        enablePoweredByContainer={false}
        query={{
          key: API_KEY,
          language: "en",
          components: "country:au",
          types: mode === "full" ? "address" : "geocode",
          ...SYDNEY_BIAS,
        }}
        onPress={(data, details) =>
          onSelect(parseGooglePlace(data, details as GooglePlaceDetails))
        }
        // Surface Google API failures (e.g. REQUEST_DENIED when billing/Places
        // API isn't enabled) instead of silently showing an empty list.
        onFail={(error) =>
          logger.warn("Google Places autocomplete request failed", {
            error: String(error),
          })
        }
        onTimeout={() =>
          logger.warn("Google Places autocomplete request timed out")
        }
        styles={{
          container: borderless
            ? styles.gpContainerBorderless
            : styles.gpContainer,
          textInputContainer: styles.gpInputContainer,
          textInput: [
            label ? styles.input : styles.searchInput,
            borderless && styles.inputBorderless,
            iconVisible && !borderless && styles.inputWithIcon,
          ],
          listView: borderless
            ? styles.listBorderless
            : label
              ? styles.list
              : styles.searchList,
          row: styles.row,
          description: styles.description,
          separator: styles.separator,
          poweredContainer: { display: "none" },
        }}
        textInputProps={{
          placeholderTextColor: theme.colors.textLight,
          selectionColor: theme.colors.text,
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
        }}
        keyboardShouldPersistTaps="handled"
        {...DISABLE_LIST_SCROLL}
      />
    ) : (
      <TextInput
        style={[
          label ? styles.input : styles.searchInput,
          borderless && styles.inputBorderless,
          iconVisible && !borderless && styles.inputWithIcon,
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textLight}
        selectionColor={theme.colors.text}
        value={text}
        onChangeText={(v) => {
          setText(v);
          debouncedFallbackSelect(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={handleFallbackSubmit}
        returnKeyType="search"
      />
    );

    if (borderless) return <View style={containerStyle}>{field}</View>;

    if (manualMode) {
      return (
        <View style={[styles.outerLabelled, containerStyle]}>
          <View style={styles.manualHeader}>
            <Text style={styles.manualTitle}>Enter address manually</Text>
            <Pressable
              onPress={() => {
                setShowStatePicker(false);
                setManualMode(false);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to address search"
            >
              <Text style={styles.manualBack}>Back to search</Text>
            </Pressable>
          </View>

          <View style={styles.manualRow}>
            <Input
              label="Unit"
              placeholder="A12"
              value={manualUnit}
              onChangeText={setManualUnit}
              autoCapitalize="characters"
              containerStyle={styles.manualUnit}
              labelBackground={labelBackground}
            />
            <Input
              label="Street Address"
              placeholder="12 New Street"
              value={manualStreet}
              onChangeText={setManualStreet}
              autoCapitalize="words"
              required
              autoFocus
              containerStyle={styles.manualStreet}
              labelBackground={labelBackground}
            />
          </View>

          <Input
            label="Suburb"
            value={manualSuburb}
            onChangeText={setManualSuburb}
            autoCapitalize="words"
            required
            labelBackground={labelBackground}
          />

          <View style={styles.manualRow}>
            <OutlinedSelect
              label="State"
              value={manualState}
              required
              focused={showStatePicker}
              onPress={() => {
                Keyboard.dismiss();
                setShowStatePicker(true);
              }}
              style={styles.manualHalf}
              labelBackground={labelBackground}
            />
            <Input
              label="Postcode"
              value={manualPostcode}
              onChangeText={(value) =>
                setManualPostcode(value.replace(/\D/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              maxLength={4}
              required
              containerStyle={styles.manualHalf}
              labelBackground={labelBackground}
            />
          </View>

          <PickerModal
            visible={showStatePicker}
            title="State"
            options={AUSTRALIAN_STATE_OPTIONS}
            value={manualState}
            onSelect={setManualState}
            onClose={() => setShowStatePicker(false)}
          />
        </View>
      );
    }

    return (
      <View
        style={[label ? styles.outerLabelled : styles.outer, containerStyle]}
      >
        <View
          style={[
            label ? styles.wrap : styles.searchWrap,
            focused && styles.wrapFocused,
          ]}
        >
          {label ? (
            <Text
              style={[
                styles.label,
                labelBackground
                  ? { backgroundColor: labelBackground }
                  : undefined,
                focused && styles.labelFocused,
              ]}
              numberOfLines={1}
            >
              {label}
              {required ? <Text style={styles.asterisk}> *</Text> : null}
            </Text>
          ) : null}

          {iconVisible ? (
            <View style={styles.iconSlot} pointerEvents="none">
              <Search size={18} color={iconColor} strokeWidth={2} />
            </View>
          ) : null}

          {field}
        </View>
        {allowManualEntry && FEATURES.GOOGLE_PLACES ? (
          <Pressable
            style={styles.manualLink}
            onPress={() => setManualMode(true)}
            accessibilityRole="button"
            accessibilityLabel="Enter address manually"
          >
            <Text style={styles.manualPrompt}>
              Can&apos;t find your address?
            </Text>
            <Text style={styles.manualLinkText}>Enter manually</Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  outer: {
    zIndex: 9999,
    elevation: 24,
  },
  outerLabelled: {
    marginTop: 10,
    zIndex: 9999,
    elevation: 24,
  },
  wrap: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    overflow: "visible",
  },
  wrapFocused: {
    borderColor: theme.colors.accent,
  },
  searchWrap: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    overflow: "visible",
  },
  label: {
    position: "absolute",
    top: -9,
    left: 10,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.surfaceWarm,
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textMuted,
    lineHeight: 18,
    zIndex: 10,
  },
  labelFocused: {
    color: theme.colors.accent,
  },
  asterisk: {
    color: theme.colors.danger,
  },
  iconSlot: {
    position: "absolute",
    left: theme.spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 2,
  },
  input: {
    height: 46,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: "transparent",
    borderWidth: 0,
    marginBottom: 0,
    paddingVertical: 0,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    height: 40,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: "transparent",
    borderWidth: 0,
    marginBottom: 0,
    paddingVertical: 0,
    paddingHorizontal: theme.spacing.md,
  },
  inputWithIcon: {
    paddingLeft: theme.spacing.md + 18 + theme.spacing.sm,
  },
  inputBorderless: {
    height: 40,
    paddingHorizontal: 0,
  },

  gpContainer: {
    flex: 0,
    overflow: "visible",
  },
  gpContainerBorderless: {
    flex: 0,
    height: 40,
    zIndex: 9999,
    elevation: 24,
  },
  gpInputContainer: {
    backgroundColor: "transparent",
    paddingTop: 0,
    paddingBottom: 0,
  },
  list: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    zIndex: 9999,
    elevation: 24,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchList: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    zIndex: 9999,
    elevation: 24,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  listBorderless: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    zIndex: 9999,
    elevation: 24,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  manualLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 4,
  },
  manualPrompt: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  manualLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  manualHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  manualTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  manualBack: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  manualUnit: { width: 96 },
  manualStreet: { flex: 1 },
  manualHalf: { flex: 1 },
});
