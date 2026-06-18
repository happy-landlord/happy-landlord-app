import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui";
import { PhoneAuthScreen, phoneEditLinkStyle } from "@/components/auth";
import { theme } from "@/constants";
import { usePhoneAuth } from "@/lib/hooks";
import { validateAuPhone } from "@/lib/services";
import { humaniseSendError } from "@/lib/utils";

const loginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine((v) => validateAuPhone(v) === null, {
      message: "Enter a valid Australian mobile number (e.g. 04xx xxx xxx)",
    }),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const auth = usePhoneAuth({ mode: "login" });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    mode: "onChange",
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "" },
  });

  const onSubmitPhone = handleSubmit(({ phone }) => auth.sendCode(phone));
  const showOtpStep = auth.step === "otp";

  return (
    <PhoneAuthScreen
      auth={auth}
      eyebrow="HAPPY Landlord"
      title="Key Manager"
      subtitle="Sign in to manage properties, keysets, and handovers from one secure place."
      onSubmitPhone={onSubmitPhone}
      sendErrorTitle="Account doesn't exist"
      humaniseSendError={(m) => humaniseSendError(m, "login")}
      sendLabel={{ idle: "Send verification code", busy: "Sending..." }}
      verifyLabel={{ idle: "Sign in", busy: "Signing in..." }}
      fields={
        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Mobile number"
              autoComplete="tel"
              autoCorrect={false}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              placeholder="04xx xxx xxx"
              value={value}
              editable={!showOtpStep}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              rightIcon={
                showOtpStep ? (
                  <Pressable
                    onPress={auth.back}
                    hitSlop={8}
                    style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                  >
                    <Text style={phoneEditLinkStyle}>Edit</Text>
                  </Pressable>
                ) : undefined
              }
            />
          )}
        />
      }
      footer={
        <>
          <View style={styles.securityNote}>
            <View style={styles.securityDot} />
            <Text style={styles.securityText}>
              Protected access for your property portfolio
            </Text>
          </View>
          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>New to HAPPY Landlord?</Text>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text style={styles.signUpLink}>Create account</Text>
            </Pressable>
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  securityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  securityText: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center" },
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  signUpPrompt: { color: theme.colors.textMuted, fontSize: 13 },
  signUpLink: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.border,
  },
});
