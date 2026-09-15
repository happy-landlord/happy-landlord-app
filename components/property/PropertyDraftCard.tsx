import { Pressable, StyleSheet, Text } from "react-native";
import { ChevronRight, FilePenLine, Trash2 } from "lucide-react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { EntityCard } from "@/components/ui";
import { PROPERTY_TYPE_LABEL, theme } from "@/constants";
import type { DbProperty } from "@/types";
import { formatStreetLine } from "@/lib/utils";

type Props = {
  draft: DbProperty;
  deleting?: boolean;
  onResume: () => void;
  onDelete: () => void;
};

export function PropertyDraftCard({
  draft,
  deleting = false,
  onResume,
  onDelete,
}: Props) {
  const streetLine = formatStreetLine(draft);
  const suburb = draft.suburb?.trim() || draft.city?.trim() || "";
  const propertyType =
    PROPERTY_TYPE_LABEL[draft.property_type] ?? draft.property_type;
  const subtitle = [suburb, propertyType].filter(Boolean).join(" · ");
  const editedAt = new Date(draft.updated_at).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <Pressable
          style={[styles.deleteAction, deleting && styles.deleteDisabled]}
          onPress={onDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={`Delete draft for ${streetLine}`}
        >
          <Trash2
            size={18}
            color={theme.colors.textInverse}
            strokeWidth={1.8}
          />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
      rightThreshold={40}
      dragOffsetFromRightEdge={20}
      dragOffsetFromLeftEdge={10000}
      overshootLeft={false}
      overshootRight={false}
    >
      <EntityCard
        icon={FilePenLine}
        iconTone="warning"
        eyebrow={`Edited ${editedAt}`}
        title={streetLine}
        subtitle={subtitle}
        right={
          <ChevronRight
            size={16}
            color={theme.colors.textLight}
            strokeWidth={2.5}
          />
        }
        onPress={onResume}
        accessibilityLabel={`Resume creating ${streetLine}`}
      />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 76,
    marginLeft: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  deleteDisabled: { opacity: 0.5 },
  deleteText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
});
