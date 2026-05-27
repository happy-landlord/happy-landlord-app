import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import { useDebouncedCallback } from "use-debounce";

import { FEATURES } from "@/constants/features";
import { SYDNEY_BIAS } from "@/constants/places";
import { theme } from "@/constants/theme";
import { normaliseSuburb } from "@/lib/places";

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
  /** Remove the component's own border/radius so it can sit inside an OutlinedField */
  borderless?: boolean;
};

export type AddressSearchRef = {
  clear: () => void;
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";


// ── Suggestion list scroll patch ──────────────────────────────────────────────
// flatListProps is supported at runtime but omitted from the published types.
// Spreading as unknown bypasses the type error while touching nothing else.
const DISABLE_LIST_SCROLL = { flatListProps: { scrollEnabled: false } } as unknown as object;

export const AddressSearch = forwardRef<AddressSearchRef, AddressSearchProps>(
  function AddressSearch({ onSelect, placeholder = "Search address…", borderless = false }, ref) {
    // ── Fallback plain-text input (used when FEATURES.GOOGLE_PLACES = false) ──
    const [text, setText] = useState("");

    // Debounce the fallback input's `onSelect` so we do not fire a synthetic
    // selection on every keystroke when the parent wires `onChangeText`-style
    // listeners. Keeps the behaviour consistent with the debounced Google
    // Places autocomplete below.
    const debouncedFallbackSelect = useDebouncedCallback(
      (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        onSelect({ placeId: "", description: trimmed, suburb: trimmed });
      },
      400,
    );

    const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        if (FEATURES.GOOGLE_PLACES) {
          placesRef.current?.clear();
        } else {
          setText("");
        }
      },
    }));

    const resolvedTextInputStyle = borderless
      ? {
          ...styles.textInput,
          borderWidth: 0,
          borderRadius: 0,
          paddingHorizontal: 0,
          marginBottom: 0,
          backgroundColor: "transparent",
        }
      : styles.textInput;

    const resolvedContainerStyle = borderless
      ? styles.containerBorderless
      : styles.container;

    const resolvedListViewStyle = borderless
      ? styles.listViewBorderless
      : styles.listView;

    // ── Bypass: plain TextInput ───────────────────────────────────────────────
    if (!FEATURES.GOOGLE_PLACES) {
      return (
        <View>
          <TextInput
            style={resolvedTextInputStyle}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textLight}
            selectionColor={theme.colors.primary}
            value={text}
            onChangeText={(v) => {
              setText(v);
              debouncedFallbackSelect(v);
            }}
            onSubmitEditing={() => {
              debouncedFallbackSelect.cancel();
              const trimmed = text.trim();
              if (!trimmed) return;
              onSelect({
                placeId: "",
                description: trimmed,
                suburb: trimmed,
              });
            }}
            returnKeyType="search"
          />
        </View>
      );
    }

    // ── Real Google Places Autocomplete ───────────────────────────────────────
    return (
      <GooglePlacesAutocomplete
        ref={placesRef}
        placeholder={placeholder}
        fetchDetails
        // Debounce keystrokes → fewer Places API hits, lower bill, smoother UI.
        debounce={400}
        enablePoweredByContainer={false}
        query={{
          key: API_KEY,
          language: "en",
          components: "country:au",
          // "geocode" returns precise addresses, partial street inputs, AND
          // locality/suburb names — unlike "address" which requires a street number.
          types: "geocode",
          // Bias toward Greater Sydney (soft — other cities still discoverable)
          ...SYDNEY_BIAS,
        }}
        onPress={(data, details) => {
          const components = details?.address_components ?? [];

          const get = (...types: string[]) =>
            components.find((c) =>
              types.every((t) => (c.types as string[]).includes(t)),
            )?.long_name;

          const getShort = (...types: string[]) =>
            components.find((c) =>
              types.every((t) => (c.types as string[]).includes(t)),
            )?.short_name;

          onSelect({
            placeId: data.place_id,
            description: data.description,
            streetNumber: get("street_number"),
            street: get("route"),
            suburb: normaliseSuburb(
              get("sublocality_level_1") ??
              get("locality") ??
              get("postal_town"),
            ),
            council: get("administrative_area_level_2"),
            state: getShort("administrative_area_level_1"),
            postcode: get("postal_code"),
            country: get("country"),
            lat: details?.geometry.location.lat,
            lng: details?.geometry.location.lng,
          });
        }}
        styles={{
          container: resolvedContainerStyle,
          textInputContainer: styles.textInputContainer,
          textInput: resolvedTextInputStyle,
          listView: resolvedListViewStyle,
          row: styles.row,
          description: styles.description,
          separator: styles.separator,
          poweredContainer: { display: "none" },
        }}
        textInputProps={{
          placeholderTextColor: theme.colors.textLight,
          selectionColor: theme.colors.primary,
        }}
        keyboardShouldPersistTaps="handled"
        // Disable internal list scrolling — max 5 suggestions, never needs scroll,
        // and this prevents Android scroll-stealing from the outer ScrollView.
        {...DISABLE_LIST_SCROLL}
      />
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  containerBorderless: {
    flex: 0,
    height: 48,
    zIndex: 9999,
    elevation: 24,
  },
  textInputContainer: {
    backgroundColor: "transparent",
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 0,
  },
  listView: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.xs,
    overflow: "hidden",
  },
  listViewBorderless: {
    position: "absolute",
    top: 48,
    left: -theme.spacing.sm,
    right: -theme.spacing.sm,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    zIndex: 9999,
    elevation: 24,
    shadowColor: "#000",
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
