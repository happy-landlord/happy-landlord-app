import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";

import { Logo } from "@/components/ui/Logo";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useLockStore } from "@/lib/lockStore";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [resendSent, setResendSent] = useState(false);
  const { setSkipBiometricOnce } = useLockStore();

  const loginMutation = useMutation({
	mutationFn: async ({ email, password }: LoginForm) => {
	  const { error } = await supabase.auth.signInWithPassword({
		email: email.trim(),
		password,
	  });
	  if (error) throw error;
	},
	onSuccess: () => {
	  // User just authenticated with email + password — no need to also ask
	  // for biometric unlock in the same session.
	  setSkipBiometricOnce(true);
	  setResendSent(false);
	},
  });

  const resendMutation = useMutation({
	mutationFn: async () => {
	  const { error } = await supabase.auth.resend({
		type: "signup",
		email: form.email.trim(),
	  });
	  if (error) throw error;
	},
	onSuccess: () => setResendSent(true),
  });

  const isEmailNotConfirmed =
	loginMutation.error instanceof Error &&
	loginMutation.error.message.toLowerCase().includes("email not confirmed");

  const canSubmit = useMemo(
	() => form.email.trim().length > 0 && form.password.length > 0 && !loginMutation.isPending,
	[form.email, form.password, loginMutation.isPending]
  );

  return (
	<KeyboardAvoidingView
	  behavior={Platform.OS === "ios" ? "padding" : undefined}
	  style={styles.screen}
	>
	  <View style={styles.topGlow} />
	  <View style={styles.bottomGlow} />

	  <ScrollView
		contentContainerStyle={styles.scrollContent}
		keyboardShouldPersistTaps="handled"
		showsVerticalScrollIndicator={false}
	  >
		<View style={styles.hero}>
		  <View style={styles.logoWrap}>
			<Logo size={86} />
		  </View>
		  <Text variant="labelLarge" style={styles.eyebrow}>
			HAPPY LANDLORD
		  </Text>
		  <Text variant="headlineMedium" style={styles.title}>
			Welcome back
		  </Text>
		  <Text variant="bodyMedium" style={styles.subtitle}>
			Sign in to manage properties, key sets, and handovers from one secure place.
		  </Text>
		</View>

		<Card mode="contained" style={styles.card}>
		  <Card.Content style={styles.cardContent}>
			<View style={styles.formHeader}>
			  <Text variant="titleLarge" style={styles.formTitle}>
				Sign in
			  </Text>
			  <Text variant="bodySmall" style={styles.formSubtitle}>
				Use your Happy Landlord account to continue.
			  </Text>
			</View>

			<TextInput
			  activeOutlineColor={theme.colors.primary}
			  autoCapitalize="none"
			  autoComplete="email"
			  keyboardType="email-address"
			  label="Email"
			  mode="outlined"
			  onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
			  outlineColor={theme.colors.border}
			  placeholder="you@example.com"
			  placeholderTextColor={theme.colors.textLight}
			  style={styles.input}
			  textColor={theme.colors.text}
			  value={form.email}
			/>

			<TextInput
			  activeOutlineColor={theme.colors.primary}
			  autoCapitalize="none"
			  autoComplete="password"
			  label="Password"
			  mode="outlined"
			  onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
			  outlineColor={theme.colors.border}
			  placeholder="Enter your password"
			  placeholderTextColor={theme.colors.textLight}
			  secureTextEntry
			  style={styles.input}
			  textColor={theme.colors.text}
			  value={form.password}
			/>

			{/* Email not confirmed banner */}
			{isEmailNotConfirmed ? (
			  <View style={styles.verifyBanner}>
				<MailCheck size={20} color={theme.colors.info} strokeWidth={2} />
				<View style={styles.verifyTextWrap}>
				  <Text style={styles.verifyTitle}>Email not verified</Text>
				  <Text style={styles.verifyBody}>
					Check your inbox and click the verification link before signing in.
				  </Text>
				  {resendSent ? (
					<Text style={styles.resendSent}>Verification email sent ✓</Text>
				  ) : (
					<Pressable
					  onPress={() => resendMutation.mutate()}
					  disabled={resendMutation.isPending}
					  style={({ pressed }) => pressed && { opacity: 0.6 }}
					>
					  <Text style={styles.resendLink}>
						{resendMutation.isPending ? "Sending…" : "Resend verification email"}
					  </Text>
					</Pressable>
				  )}
				</View>
			  </View>
			) : (
			  <HelperText
				padding="none"
				style={[styles.errorText, !loginMutation.error && styles.errorTextHidden]}
				type="error"
				visible={Boolean(loginMutation.error)}
			  >
				{loginMutation.error instanceof Error ? loginMutation.error.message : "Sign in failed."}
			  </HelperText>
			)}

			<Button
			  buttonColor={theme.colors.primary}
			  contentStyle={styles.buttonContent}
			  disabled={!canSubmit}
			  labelStyle={styles.buttonLabel}
			  loading={loginMutation.isPending}
			  mode="contained"
			  onPress={() => loginMutation.mutate(form)}
			  style={styles.button}
			  textColor={theme.colors.textInverse}
			>
			  Sign in securely
			</Button>

			<View style={styles.securityNote}>
			  <View style={styles.securityDot} />
			  <Text variant="bodySmall" style={styles.securityText}>
				Protected access for your property portfolio
			  </Text>
			</View>

			<View style={styles.signUpRow}>
			  <Text variant="bodySmall" style={styles.signUpPrompt}>
				New to Happy Landlord?
			  </Text>
			  <Pressable
				onPress={() => router.push("/(auth)/signup")}
				style={({ pressed }) => pressed && { opacity: 0.6 }}
			  >
				<Text style={styles.signUpLink}>Create account</Text>
			  </Pressable>
			</View>
		  </Card.Content>
		</Card>
	  </ScrollView>
	</KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
	flex: 1,
	backgroundColor: theme.colors.background,
  },
  scrollContent: {
	flexGrow: 1,
	justifyContent: "center",
	padding: theme.spacing.screen,
	paddingVertical: theme.spacing.xl,
  },
  topGlow: {
	position: "absolute",
	top: -120,
	right: -90,
	width: 260,
	height: 260,
	borderRadius: 130,
	backgroundColor: theme.colors.accentSoft,
  },
  bottomGlow: {
	position: "absolute",
	bottom: -140,
	left: -100,
	width: 300,
	height: 300,
	borderRadius: 150,
	backgroundColor: theme.colors.primarySoft,
  },
  hero: {
	alignItems: "center",
	marginBottom: theme.spacing.lg,
  },
  logoWrap: {
	borderRadius: theme.radius.lg,
	overflow: "hidden",
	marginBottom: theme.spacing.md,
  },
  eyebrow: {
	marginBottom: theme.spacing.xs,
	color: theme.colors.primary,
	fontWeight: "700",
	letterSpacing: 1.6,
	textAlign: "center",
  },
  title: {
	color: theme.colors.text,
	fontWeight: "800",
	textAlign: "center",
  },
  subtitle: {
	maxWidth: 360,
	marginTop: theme.spacing.sm,
	color: theme.colors.textMuted,
	lineHeight: 22,
	textAlign: "center",
  },
  card: {
	width: "100%",
	maxWidth: 460,
	alignSelf: "center",
	borderWidth: 1,
	borderColor: theme.colors.border,
	borderRadius: theme.radius.card,
	backgroundColor: theme.colors.surfaceWarm,
	shadowColor: theme.colors.charcoal,
	shadowOffset: { width: 0, height: 16 },
	shadowOpacity: 0.12,
	shadowRadius: 28,
	elevation: 6,
  },
  cardContent: {
	gap: theme.spacing.md,
	padding: theme.spacing.lg,
  },
  formHeader: {
	gap: theme.spacing.xs,
	marginBottom: theme.spacing.xs,
  },
  formTitle: {
	color: theme.colors.text,
	fontWeight: "700",
  },
  formSubtitle: {
	color: theme.colors.textMuted,
  },
  input: {
	backgroundColor: theme.colors.surface,
  },
  errorText: {
	color: theme.colors.danger,
  },
  errorTextHidden: {
	height: 0,
	marginTop: 0,
	marginBottom: 0,
	paddingTop: 0,
	paddingBottom: 0,
  },
  button: {
	borderRadius: theme.radius.pill,
  },
  buttonContent: {
	minHeight: 52,
  },
  buttonLabel: {
	fontSize: 16,
	fontWeight: "700",
  },
  securityNote: {
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "center",
	gap: theme.spacing.sm,
	paddingTop: theme.spacing.xs,
  },
  securityDot: {
	width: 8,
	height: 8,
	borderRadius: 4,
	backgroundColor: theme.colors.success,
  },
  securityText: {
	color: theme.colors.textMuted,
	textAlign: "center",
  },
  signUpRow: {
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "center",
	gap: theme.spacing.xs,
	paddingTop: theme.spacing.xs,
  },
  signUpPrompt: {
	color: theme.colors.textMuted,
  },
  signUpLink: {
	fontSize: 13,
	color: theme.colors.primary,
	fontWeight: "700",
  },
  verifyBanner: {
	flexDirection: "row",
	gap: theme.spacing.sm,
	backgroundColor: theme.colors.infoSoft,
	borderRadius: theme.radius.md,
	borderWidth: 1,
	borderColor: theme.colors.info + "40",
	padding: theme.spacing.md,
  },
  verifyTextWrap: {
	flex: 1,
	gap: theme.spacing.xs,
  },
  verifyTitle: {
	fontSize: 14,
	fontWeight: "700",
	color: theme.colors.info,
  },
  verifyBody: {
	fontSize: 13,
	color: theme.colors.text,
	lineHeight: 18,
  },
  resendLink: {
	fontSize: 13,
	color: theme.colors.primary,
	fontWeight: "600",
	marginTop: 2,
  },
  resendSent: {
	fontSize: 13,
	color: theme.colors.success,
	fontWeight: "600",
	marginTop: 2,
  },
});
