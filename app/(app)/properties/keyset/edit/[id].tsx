import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, ErrorState, LoadingState, PhotoPicker } from "@/components/ui";
import { useKeySetEditForm } from "@/components/keyset";
import { KEY_TYPE_ICON, theme } from "@/constants";
import { getKeyName } from "@/lib/utils";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditKeySetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    keySet,
    keySetLoading,
    isError,
    refetch,
    keyAssignment,
    pendingName,
    setPendingName,
    photoUris,
    setPhotoUris,
    isSaving,
    save,
  } = useKeySetEditForm(id);

  // ── Render ────────────────────────────────────────────────────────────────
  if (keySetLoading) return <LoadingState message="Loading keyset…" />;
  if (isError || !keySet) {
    return (
      <ErrorState
        title="Keyset not found"
        message="Could not load this keyset."
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={Platform.OS === "ios" ? 32 : 16}
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={pendingName}
              onChangeText={setPendingName}
              placeholder="Keyset name"
              placeholderTextColor={theme.colors.textLight}
              autoCorrect={false}
              returnKeyType="done"
              maxLength={60}
            />
          </View>
        </View>

        {/* Assigned keys */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Assigned keys</Text>
          {keyAssignment.assigned.length === 0 ? (
            <Text style={styles.emptyText}>No keys assigned yet.</Text>
          ) : (
            <View style={styles.keyList}>
              {keyAssignment.assigned.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => keyAssignment.unassign(k)}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.keyRow,
                      styles.assignedKeyRow,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <View style={[styles.keyIconCircle, styles.assignedKeyIconCircle]}>
                      <Icon size={14} color={theme.colors.surface} strokeWidth={1.8} />
                    </View>
                    <View style={styles.keyInfo}>
                      <Text style={styles.keyLabel} numberOfLines={1}>
                        {getKeyName(k)}
                      </Text>
                      {k.code ? (
                        <View style={styles.codeChip}>
                          <Text style={styles.codeChipText}>{k.code}</Text>
                        </View>
                      ) : null}
                    </View>
                    {(k.quantity ?? 1) > 1 && (
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>{k.quantity}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Available to assign */}
        {keyAssignment.unassigned.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Available to assign</Text>
            <View style={styles.keyList}>
              {keyAssignment.unassigned.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => keyAssignment.assign(k)}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.keyRow,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <View style={styles.keyIconCircle}>
                      <Icon size={14} color={theme.colors.accent} strokeWidth={1.8} />
                    </View>
                    <View style={styles.keyInfo}>
                      <Text style={styles.keyLabel} numberOfLines={1}>
                        {getKeyName(k)}
                      </Text>
                      {k.code ? (
                        <View style={styles.codeChip}>
                          <Text style={styles.codeChipText}>{k.code}</Text>
                        </View>
                      ) : null}
                    </View>
                    {(k.quantity ?? 1) > 1 && (
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>{k.quantity}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Photos */}
        <View style={styles.photoSection}>
          <PhotoPicker
            uris={photoUris}
            onChange={setPhotoUris}
            color={theme.colors.accent}
            label="Keyset Photos"
            hint="Tap to add photos of the keyset"
            compact
          />
        </View>
      </KeyboardAwareScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          disabled={isSaving}
          style={styles.cancelBtn}
        />
        <Button
          title="Save"
          variant="primary"
          loading={isSaving}
          disabled={isSaving}
          onPress={() => save(() => router.back())}
          style={styles.saveBtn}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: { gap: theme.spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  inputGroup: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  keyList: { gap: 6 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assignedKeyRow: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
  },
  keyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  assignedKeyIconCircle: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  keyInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.text, flexShrink: 1 },
  codeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  codeChipText: { fontSize: 10, fontWeight: "700", color: theme.colors.textMuted },
  qtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  qtyChipText: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
  photoSection: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});
