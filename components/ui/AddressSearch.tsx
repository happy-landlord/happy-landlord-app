import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
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

/**
 * @deprecated Use `ParsedAddress` from `@/lib/utils`. Re-exported here so
 * existing `import { PlaceResult } from "@/components/ui"` call sites keep
 * working — the canonical definition now lives in the address module.
 */
export type PlaceResult = ParsedAddress;

type AddressSearchProps = {
  onSelect: (place: PlaceResult) => void;
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
      placeholder = "Search address…",
      label,
      required,
      initialValue,
      labelBackground,
      containerStyle,
      borderless = false,
      showIcon,
      mode = "partial",
    },
    ref,
  ) {
    const [text, setText] = useState(initialValue ?? "");
    const [focused, setFocused] = useState(false);
    const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

    const iconVisible = showIcon ?? !label;
    const iconColor = focused ? theme.colors.accent : theme.colors.textLight;

    // Pre-fill the Google Places input with the initial value after mount
    useEffect(() => {
      if (initialValue && placesRef.current) {
        placesRef.current.setAddressText(initialValue);
      }
    }, [initialValue]);

    const debouncedFallbackSelect = useDebouncedCallback((raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      onSelect(plainTextAddress(trimmed));
    }, 400);

    useImperativeHandle(ref, () => ({
      clear: () => {
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
});
