import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";

import { supabase } from "@/lib/supabase";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });

  const loginMutation = useMutation({
	mutationFn: async ({ email, password }: LoginForm) => {
	  const { error } = await supabase.auth.signInWithPassword({
		email: email.trim(),
		password,
	  });

	  if (error) {
		throw error;
	  }
	},
  });

  const canSubmit = useMemo(() => {
	return form.email.trim().length > 0 && form.password.length > 0 && !loginMutation.isPending;
  }, [form.email, form.password, loginMutation.isPending]);

  return (
	<KeyboardAvoidingView
	  behavior={Platform.OS === "ios" ? "padding" : undefined}
	  style={{ flex: 1, justifyContent: "center", padding: 16 }}
	>
	  <Card>
		<Card.Content style={{ gap: 12 }}>
		  <Text variant="headlineSmall">Sign in</Text>
		  <Text variant="bodyMedium">Use your Happy Landlord account to continue.</Text>

		  <TextInput
			autoCapitalize="none"
			autoComplete="email"
			keyboardType="email-address"
			label="Email"
			mode="outlined"
			onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
			value={form.email}
		  />

		  <TextInput
			autoCapitalize="none"
			autoComplete="password"
			label="Password"
			mode="outlined"
			onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
			secureTextEntry
			value={form.password}
		  />

		  <HelperText type="error" visible={Boolean(loginMutation.error)}>
			{loginMutation.error instanceof Error ? loginMutation.error.message : "Sign in failed."}
		  </HelperText>

		  <View style={{ marginTop: 4 }}>
			<Button
			  loading={loginMutation.isPending}
			  mode="contained"
			  onPress={() => loginMutation.mutate(form)}
			  disabled={!canSubmit}
			>
			  Sign in
			</Button>
		  </View>
		</Card.Content>
	  </Card>
	</KeyboardAvoidingView>
  );
}


