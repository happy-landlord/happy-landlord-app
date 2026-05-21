import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import { theme } from "@/constants/theme";

/**
 * Deep-link callback screen for Supabase auth flows (email verification,
 * magic links, password reset, etc.).
 *
 * Supabase redirects to  hlapp://auth/callback?code=XXXX
 * after the user taps the link in their email.
 * We parse the `code` param and exchange it for a live session.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const handled = useRef(false);

  const handleUrl = async (url: string) => {
    if (handled.current) return;
    handled.current = true;

    try {
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;

      if (code) {
        // PKCE flow — exchange one-time code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("Auth callback error (code exchange):", error.message);
        }
      } else {
        // Implicit / fragment flow fallback — parse hash tokens
        const fragment = url.split("#")[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.warn("Auth callback error (set session):", error.message);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Auth callback error:", err);
    }

    // The session listener in useSession() will update automatically.
    // Push to the root so the layout redirects to the right screen.
    router.replace("/");
  };

  useEffect(() => {
    // App opened from a killed state via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // App brought to foreground via deep link while running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.logoWrap}>
        <Logo size={56} />
      </View>
      <ActivityIndicator
        color={theme.colors.primary}
        size="large"
        style={styles.spinner}
      />
      <Text style={styles.label}>Verifying your email…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
  },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  spinner: {
    marginTop: theme.spacing.sm,
  },
  label: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

