import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlaskConical } from "lucide-react-native";

import { Button } from "@/components/ui";
import { theme } from "@/constants";
import { useAdminSendTestNotification, useCurrentUserId } from "@/lib/hooks";
import type { NotificationType } from "@/lib/services";
import {
  NOTIFICATION_TYPE_LIST,
  NOTIFICATION_VISUALS,
} from "./notificationVisuals";

// ── AdminPushTestPanel ───────────────────────────────────────────────────────
// Collapsible panel rendered at the top of the notifications list for admins.
// Sends a real test notification through the same RPC + edge function path
// production uses, then dispatches a push to the admin's own device.

export function AdminPushTestPanel() {
  const userId = useCurrentUserId();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("Test push notification");
  const [body, setBody] = useState(
    "This is a test push — sent from the admin panel.",
  );
  const [selectedType, setSelectedType] = useState<NotificationType>(
    "KEY_CHECKOUT_CREATED",
  );

  const sendTest = useAdminSendTestNotification();

  async function handleSend() {
    if (!userId) return;
    try {
      await sendTest.mutateAsync({
        recipientUserId: userId,
        title: title.trim() || "Test notification",
        body: body.trim() || "Test body",
        type: selectedType,
      });
      Alert.alert(
        "✅ Test sent",
        "Notification created and push dispatched to your device.",
      );
    } catch {
      // Error handled by global toast via MutationCache
    }
  }

  if (!userId) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? "Collapse admin test panel" : "Expand admin test panel"
        }
      >
        <View style={styles.headerLeft}>
          <FlaskConical
            size={16}
            color={theme.colors.warning}
            strokeWidth={2}
          />
          <Text style={styles.headerTitle}>Admin — Push Test</Text>
        </View>
        <Text style={styles.toggle}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title"
            placeholderTextColor={theme.colors.textLight}
            returnKeyType="next"
          />

          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={body}
            onChangeText={setBody}
            placeholder="Notification body"
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {NOTIFICATION_TYPE_LIST.map((t) => {
              const visual = NOTIFICATION_VISUALS[t];
              const Icon = visual.Icon;
              const active = t === selectedType;
              return (
                <Pressable
                  key={t}
                  onPress={() => setSelectedType(t)}
                  style={({ pressed }) => [
                    styles.typeChip,
                    active && styles.typeChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Icon
                    size={11}
                    color={active ? visual.color : theme.colors.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      active && { color: visual.color },
                    ]}
                    numberOfLines={1}
                  >
                    {visual.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            title="Send test push →"
            variant="warning"
            loading={sendTest.isPending}
            disabled={sendTest.isPending}
            onPress={handleSend}
            accessibilityLabel="Send test push notification"
            style={styles.sendBtn}
          />

          <Text style={styles.note}>
            ⚠️ Sends to your own device only. Push payload omits full property
            addresses.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.warningSoft,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    backgroundColor: theme.colors.warningSoft,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.warning,
    letterSpacing: 0.2,
  },
  toggle: { fontSize: 11, color: theme.colors.warning, fontWeight: "700" },
  body: { padding: theme.spacing.md, gap: theme.spacing.sm },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
    paddingTop: theme.spacing.sm,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.neutralSoft,
  },
  typeChipActive: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sendBtn: {
    marginTop: theme.spacing.xs,
  },
  note: {
    fontSize: 11,
    color: theme.colors.textLight,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
});
