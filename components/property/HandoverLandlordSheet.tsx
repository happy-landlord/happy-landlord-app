import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { BottomSheet } from "@/components/ui";
import { theme } from "@/constants";
import { useHandoverToLandlord } from "@/lib/hooks";
import { alertError } from "@/lib/utils";
import { useRouter } from "expo-router";

type Props = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
};

export function HandoverLandlordSheet({ visible, onClose, propertyId }: Props) {
  const router = useRouter();
  const handoverMut = useHandoverToLandlord(propertyId);

  function handleConfirm() {
    handoverMut.mutate(undefined, {
      onSuccess: () => {
        onClose();
        router.back();
      },
      onError: (err) => alertError("Error", err, "Failed to complete handover."),
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.iconWrap}>
        <AlertTriangle size={28} color={theme.colors.warning} strokeWidth={1.8} />
      </View>

      <Text style={styles.title}>Handover to Landlord</Text>
      <Text style={styles.body}>
        This will mark all keysets as{" "}
        <Text style={styles.bold}>With Landlord</Text> and set the property to{" "}
        <Text style={styles.bold}>inactive</Text>. This action cannot easily be
        undone.
      </Text>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          onPress={onClose}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && { opacity: 0.82 },
            handoverMut.isPending && { opacity: 0.5 },
          ]}
          onPress={handleConfirm}
          disabled={handoverMut.isPending}
        >
          {handoverMut.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Handover</Text>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: theme.spacing.lg,
  },
  bold: {
    fontWeight: "700",
    color: theme.colors.text,
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warning,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});

