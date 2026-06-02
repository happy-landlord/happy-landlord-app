import { Text, View, StyleSheet } from "react-native";
import { AlertTriangle, Building2, ChevronRight, Clock3 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Card, IconBadge, PressableCard } from "@/components/ui";
import { theme } from "@/constants";
import type { KeySetNeedingAttention } from "@/lib/services";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortAttentionKeysets(
  keysets: KeySetNeedingAttention[],
): KeySetNeedingAttention[] {
  return [...keysets]
    .filter((item) => item.property)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "missing_damaged" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

function uniqueLocation(parts: (string | null | undefined)[]): string {
  return parts
    .filter((v): v is string => Boolean(v))
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
    )
    .join(", ");
}

// ── Row ──────────────────────────────────────────────────────────────────────

function AttentionRow({
  item,
  onPress,
}: {
  item: KeySetNeedingAttention;
  onPress: () => void;
}) {
  const property = item.property;
  const location = uniqueLocation([
    property?.suburb,
    property?.city,
    property?.postcode,
  ]);
  const isMissing = item.status === "missing_damaged";
  const holderName = item.current_holder?.full_name ?? null;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} needs attention`}
      style={styles.row}
    >
      <IconBadge icon={Building2} tone="danger" size="md" />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.propertyAddress} numberOfLines={1}>
          {property?.address ?? "Property"}
        </Text>
        {location ? (
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        ) : null}

        <View style={styles.alertRow}>
          {isMissing ? (
            <>
              <AlertTriangle size={12} color={theme.colors.danger} strokeWidth={2} />
              <Text style={styles.alertLabelDanger}>Missing or damaged</Text>
            </>
          ) : (
            <>
              <Clock3 size={12} color={theme.colors.warning} strokeWidth={2} />
              <Text style={styles.alertLabelWarning} numberOfLines={1}>
                Overdue{holderName ? ` · ${holderName}` : ""}
              </Text>
            </>
          )}
        </View>
      </View>

      <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2} />
    </PressableCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type KeySetAttentionListProps = {
  data?: KeySetNeedingAttention[];
  isLoading?: boolean;
};

/**
 * List of keysets that need admin attention (overdue or missing/damaged).
 * Shown on the admin dashboard.
 */
export function KeySetAttentionList({
  data = [],
  isLoading = false,
}: KeySetAttentionListProps) {
  const router = useRouter();
  const keysets = sortAttentionKeysets(data);

  if (isLoading) {
    return (
      <Card>
        <Text style={styles.emptyText}>Checking for issues…</Text>
      </Card>
    );
  }

  if (keysets.length === 0) {
    return (
      <Card>
        <Text style={styles.emptyText}>
          No issues detected. All keys are accounted for.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {keysets.map((item) => (
        <AttentionRow
          key={item.id}
          item={item}
          onPress={() =>
            router.push(`/(app)/properties/keyset/${item.id}` as never)
          }
        />
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { gap: theme.spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  propertyAddress: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  location: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  alertLabelDanger: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  alertLabelWarning: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

