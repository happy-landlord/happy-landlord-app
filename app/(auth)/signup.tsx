import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
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

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine((v) => validateAuPhone(v) === null, {
      message: "Enter a valid Australian mobile number (e.g. 04xx xxx xxx)",
    }),
});
type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const router = useRouter();
  const auth = usePhoneAuth({ mode: "register" });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    mode: "onTouched",
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", phone: "" },
  });

  const onSubmitPhone = handleSubmit(({ fullName, phone }) =>
    auth.sendCode(phone, fullName),
  );
  const showOtpStep = auth.step === "otp";

  return (
    <PhoneAuthScreen
      auth={auth}
      eyebrow="HAPPY Landlord"
      title="Create Account"
      subtitle="Register as an agent to manage properties and keysets. An admin will review and approve your account."
      onSubmitPhone={onSubmitPhone}
      sendErrorTitle="Registration failed"
      humaniseSendError={(m) => humaniseSendError(m, "register")}
      sendLabel={{ idle: "Send verification code", busy: "Sending..." }}
      verifyLabel={{ idle: "Complete registration", busy: "Verifying..." }}
      fields={
        <>
          {!showOtpStep && (
            <Controller
              control={control}
              name="fullName"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Full name"
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect={false}
                  placeholder="Jane Smith"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.fullName?.message}
                />
              )}
            />
          )}
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
        </>
      }
      footer={
        <>
          <View style={styles.approvalNote}>
            <Text style={styles.approvalText}>
              By signing up you agree to our{" "}
              <Text
                style={styles.approvalLink}
                onPress={() =>
                  Linking.openURL("https://happy-landlord.netlify.app/terms")
                }
              >
                Terms of Service
              </Text>
            </Text>
          </View>
          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account?</Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text style={styles.loginLink}>Sign in</Text>
            </Pressable>
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  approvalNote: { alignItems: "center", justifyContent: "center" },
  approvalText: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center" },
  approvalLink: {
    color: theme.colors.text,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.border,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  loginPrompt: { color: theme.colors.textMuted, fontSize: 13 },
  loginLink: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.border,
  },
});
