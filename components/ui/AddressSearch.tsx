import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";

import { theme } from "@/constants/theme";

export type PlaceResult = {
  placeId: string;
  description: string;
  streetNumber?: string;
  street?: string;
  suburb?: string;
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
};

export type AddressSearchRef = {
  clear: () => void;
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

export const AddressSearch = forwardRef<AddressSearchRef, AddressSearchProps>(
  function AddressSearch({ onSelect, placeholder = "Search address…" }, ref) {
    const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        placesRef.current?.clear();
      },
    }));

    return (
      <GooglePlacesAutocomplete
        ref={placesRef}
        placeholder={placeholder}
        fetchDetails
        enablePoweredByContainer={false}
        query={{
          key: API_KEY,
          language: "en",
          components: "country:au",
          types: "address",
        }}
        onPress={(data, details) => {
          const components = details?.address_components ?? [];

          const get = (...types: string[]) =>
            components.find((c) =>
              types.every((t) => (c.types as string[]).includes(t))
            )?.long_name;

          const getShort = (...types: string[]) =>
            components.find((c) =>
              types.every((t) => (c.types as string[]).includes(t))
            )?.short_name;

          onSelect({
            placeId: data.place_id,
            description: data.description,
            streetNumber: get("street_number"),
            street: get("route"),
            suburb: get("locality"),
            state: getShort("administrative_area_level_1"),
            postcode: get("postal_code"),
            country: get("country"),
            lat: details?.geometry.location.lat,
            lng: details?.geometry.location.lng,
          });
        }}
        styles={{
          container: styles.container,
          textInputContainer: styles.textInputContainer,
          textInput: styles.textInput,
          listView: styles.listView,
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
      />
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 0,
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

