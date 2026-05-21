import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { AddressSearch, type AddressSearchRef, type PlaceResult } from "./AddressSearch";
import { theme } from "@/constants/theme";


export type AddressSearchBarRef = {
  clear: () => void;
};

type Props = {
  onSelect: (place: PlaceResult) => void;
  onClear: () => void;
  selectedPlace: PlaceResult | null;
  resultCount: number;
  /** Singular + plural labels, e.g. ["property", "properties"] */
  resultLabel?: [string, string];
  placeholder?: string;
};

export const AddressSearchBar = forwardRef<AddressSearchBarRef, Props>(
  function AddressSearchBar(
    {
      onSelect,
      onClear,
      selectedPlace,
      resultCount,
      resultLabel = ["result", "results"],
      placeholder = "Filter by property address…",
    },
    ref
  ) {
    const searchRef = useRef<AddressSearchRef>(null);

    useImperativeHandle(ref, () => ({
      clear: () => searchRef.current?.clear(),
    }));

    const handleClear = () => {
      searchRef.current?.clear();
      onClear();
    };

    const label = resultCount === 1 ? resultLabel[0] : resultLabel[1];
    const filterText = selectedPlace
      ? ` · ${selectedPlace.suburb ?? selectedPlace.description.split(",")[0].trim()}`
      : "";

    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.searchWrap}>
            <AddressSearch
              ref={searchRef}
              placeholder={placeholder}
              onSelect={onSelect}
            />
          </View>
          {selectedPlace ? (
            <Pressable
              onPress={handleClear}
              style={styles.clearBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear filter"
            >
              <X size={16} color={theme.colors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.resultCount}>
          {resultCount} {label}{filterText}
        </Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  searchWrap: {
    flex: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    paddingLeft: 2,
  },
});

