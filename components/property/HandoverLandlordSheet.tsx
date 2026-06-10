import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { BottomSheet, Button } from "@/components/ui";
import { theme } from "@/constants";
import { useHandoverToLandlord } from "@/lib/hooks";
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
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.iconWrap}>
        <AlertTriangle
          size={28}
          color={theme.colors.warning}
          strokeWidth={1.8}
        />
      </View>

      <Text style={styles.title}>Handover to Landlord</Text>
      <Text style={styles.body}>
        This will mark all keysets as{" "}
        <Text style={styles.bold}>With Landlord</Text> and set the property to{" "}
        <Text style={styles.bold}>inactive</Text>. This action cannot easily be
        undone.
      </Text>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onClose}
          style={styles.cancelBtn}
        />
        <Button
          title="Confirm Handover"
          variant="warning"
          loading={handoverMut.isPending}
          disabled={handoverMut.isPending}
          onPress={handleConfirm}
          style={styles.confirmBtn}
        />
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
  cancelBtn: { flex: 1 },
  confirmBtn: { flex: 2 },
});
