import { forwardRef, useImperativeHandle, useRef, useState } from "react";
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
import { normaliseSuburb } from "@/lib/utils";

export type PlaceResult = {
  placeId: string;
  description: string;
  streetNumber?: string;
  street?: string;
  suburb?: string;
  /** Local Government Area / council name (administrative_area_level_2) */
  council?: string;
  state?: string;
  postcode?: string;
  country?: string;
  lat?: number;
  lng?: number;
};

type AddressSearchProps = {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
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

type PlaceDetails = {
  address_components?: {
    types: string[];
    long_name: string;
    short_name: string;
  }[];
  geometry?: { location: { lat: number; lng: number } };
} | null;

export const AddressSearch = forwardRef<AddressSearchRef, AddressSearchProps>(
  function AddressSearch(
    {
      onSelect,
      placeholder = "Search address…",
      label,
      required,
      labelBackground,
      containerStyle,
      borderless = false,
      showIcon,
      mode = "partial",
    },
    ref,
  ) {
    const [text, setText] = useState("");
    const [focused, setFocused] = useState(false);
    const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

    const iconVisible = showIcon ?? !label;
    const iconColor = focused ? theme.colors.accent : theme.colors.textLight;

    const debouncedFallbackSelect = useDebouncedCallback((raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      onSelect({ placeId: "", description: trimmed, suburb: trimmed });
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
      onSelect({ placeId: "", description: trimmed, suburb: trimmed });
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
        onPress={(data, details) => onSelect(parsePlace(data, details))}
        styles={{
          container: borderless ? styles.gpContainerBorderless : styles.gpContainer,
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
      <View style={[label ? styles.outerLabelled : styles.outer, containerStyle]}>
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
                labelBackground ? { backgroundColor: labelBackground } : undefined,
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

function parsePlace(
  data: { place_id: string; description: string },
  details: PlaceDetails,
): PlaceResult {
  const components = details?.address_components ?? [];
  const get = (...types: string[]) =>
    components.find((c) => types.every((t) => c.types.includes(t)))?.long_name;
  const getShort = (...types: string[]) =>
    components.find((c) => types.every((t) => c.types.includes(t)))?.short_name;

  return {
    placeId: data.place_id,
    description: data.description,
    streetNumber: get("street_number"),
    street: get("route"),
    suburb: normaliseSuburb(
      get("sublocality_level_1") ?? get("locality") ?? get("postal_town"),
    ),
    council: get("administrative_area_level_2"),
    state: getShort("administrative_area_level_1"),
    postcode: get("postal_code"),
    country: get("country"),
    lat: details?.geometry?.location.lat,
    lng: details?.geometry?.location.lng,
  };
}

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
