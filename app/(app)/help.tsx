import { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { theme } from "@/constants";
import { useRole } from "@/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type QuickAction = {
  id: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
};

type PopularTopic = {
  id: string;
  icon: IoniconName;
  title: string;
  onPress: () => void;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

type BrowseSection = {
  id: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  title: string;
  faqs: FAQItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Contact constants
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORT_EMAIL = "info@happylandlord.com.au";
const TECH_EMAIL = "tech@happylandlord.com.au";
const SUPPORT_PHONE = "0466663356";
const SUPPORT_PHONE_DISPLAY = "0466 663 356";

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

function getQuickActions(
  router: ReturnType<typeof useRouter>,
): QuickAction[] {
  return [
    {
      id: "contact",
      icon: "chatbubble-ellipses-outline",
      iconBg: theme.colors.accentSoft,
      iconColor: theme.colors.accent,
      title: "Contact Support",
      description: "Email the Happy Landlord support team",
      onPress: () =>
        Linking.openURL(
          `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`,
        ).catch(() =>
          Alert.alert("Unavailable", "Could not open your mail app."),
        ),
    },
    {
      id: "report",
      icon: "bug-outline",
      iconBg: theme.colors.infoSoft,
      iconColor: theme.colors.info,
      title: "Report a Tech Issue",
      description: "Something broken? Let the tech team know",
      onPress: () =>
        Alert.alert(
          "Report a Tech Issue",
          "Describe the problem and we'll investigate.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Send Email",
              onPress: () =>
                Linking.openURL(
                  `mailto:${TECH_EMAIL}?subject=Tech%20Issue%20Report`,
                ).catch(() =>
                  Alert.alert("Unavailable", "Could not open your mail app."),
                ),
            },
          ],
        ),
    },
    {
      id: "requests",
      icon: "document-text-outline",
      iconBg: theme.colors.accentSoft,
      iconColor: theme.colors.accent,
      title: "My Activity",
      description: "View your checked-out keysets",
      onPress: () => router.push("/(app)/(tabs)/activity"),
    },
    {
      id: "call",
      icon: "call-outline",
      iconBg: theme.colors.successSoft,
      iconColor: theme.colors.success,
      title: "Call Support",
      description: `Speak to someone now · ${SUPPORT_PHONE_DISPLAY}`,
      onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE}`),
    },
  ];
}

function getPopularTopics(setSearchQuery: (q: string) => void): PopularTopic[] {
  return [
    {
      id: "scanner",
      icon: "scan-outline",
      title: "Scanner not working",
      onPress: () => setSearchQuery("scanner"),
    },
    {
      id: "missing-key",
      icon: "key-outline",
      title: "Keyset is missing",
      onPress: () => setSearchQuery("lost keyset"),
    },
    {
      id: "return",
      icon: "return-down-back-outline",
      title: "How to return a keyset",
      onPress: () => setSearchQuery("handover"),
    },
    {
      id: "password",
      icon: "eye-off-outline",
      title: "Forgot password",
      onPress: () => setSearchQuery("password"),
    },
    {
      id: "notifications",
      icon: "notifications-off-outline",
      title: "Notifications not showing",
      onPress: () => setSearchQuery("notifications"),
    },
  ];
}

const BROWSE_SECTIONS: BrowseSection[] = [
  {
    id: "account",
    icon: "person-circle-outline",
    iconBg: theme.colors.accentSoft,
    iconColor: theme.colors.accent,
    title: "Account & Login",
    faqs: [
      {
        id: "a1",
        question: "How do I reset my password?",
        answer:
          'Tap "Forgot password" on the login screen and follow the email link to create a new password.',
      },
      {
        id: "a2",
        question: "How do I enable biometric login?",
        answer:
          "Go to Settings → Security and toggle on Face ID / Fingerprint login.",
      },
      {
        id: "a3",
        question: "Why is my account pending approval?",
        answer:
          "New accounts require approval from Happy Landlord before you can access keysets and properties.",
      },
    ],
  },
  {
    id: "keys",
    icon: "key-outline",
    iconBg: theme.colors.accentSoft,
    iconColor: theme.colors.accentDark,
    title: "Keysets & Access",
    faqs: [
      {
        id: "k1",
        question: "How do I check out a keyset?",
        answer:
          "Scan the QR or NFC tag on the keyset, then confirm checkout. The keyset will be assigned to you.",
      },
      {
        id: "k2",
        question: "How do I return a keyset?",
        answer:
          "Scan the keyset tag again while it is checked out to you. Confirm the return to complete the handover.",
      },
      {
        id: "k3",
        question: "What does 'overdue' mean?",
        answer:
          "A keyset is overdue when its scheduled return date has passed and it has not been returned. Call support on 0466 663 356.",
      },
      {
        id: "k4",
        question: "How do I report a lost keyset?",
        answer:
          "Open the keyset detail screen, tap the options menu, and select 'Report Lost'. Support will be notified.",
      },
    ],
  },
  {
    id: "scanner",
    icon: "scan-circle-outline",
    iconBg: theme.colors.infoSoft,
    iconColor: theme.colors.info,
    title: "Scanner",
    faqs: [
      {
        id: "s1",
        question: "The scanner isn't reading the tag. What do I do?",
        answer:
          "Ensure the tag is clean and undamaged. Hold your phone steady, 5–10 cm from the tag. Check that camera permissions are enabled in Settings.",
      },
      {
        id: "s2",
        question: "Can I scan NFC and QR codes?",
        answer:
          "Yes. The scanner supports both QR codes via the camera and NFC tags by tapping your phone against the tag.",
      },
      {
        id: "s3",
        question: "My phone doesn't support NFC. Can I still use the app?",
        answer:
          "Yes. You can use QR code scanning instead. All keyset tags include a QR code as a fallback.",
      },
    ],
  },
  {
    id: "checkin",
    icon: "swap-horizontal-outline",
    iconBg: theme.colors.successSoft,
    iconColor: theme.colors.success,
    title: "Check-in & Handover",
    faqs: [
      {
        id: "c1",
        question: "How does a keyset handover work?",
        answer:
          "The current holder initiates a handover, and the recipient scans the keyset tag to accept and confirm transfer.",
      },
      {
        id: "c2",
        question: "Can I hand a keyset to someone who isn't in the app?",
        answer:
          "No. Both parties must have an active account. The recipient must be registered and approved.",
      },
      {
        id: "c3",
        question: "What happens if a handover is not confirmed?",
        answer:
          "The keyset remains assigned to the original holder until the recipient scans and confirms. Call support on 0466 663 356 if you are stuck.",
      },
    ],
  },
  {
    id: "requests",
    icon: "calendar-outline",
    iconBg: theme.colors.warningSoft,
    iconColor: theme.colors.warning,
    title: "Requests & Bookings",
    faqs: [
      {
        id: "r1",
        question: "How do I request access to a property?",
        answer:
          "Go to the property listing and tap 'Request Access'. Support will review and approve or decline.",
      },
      {
        id: "r2",
        question: "How long does approval take?",
        answer:
          "Approval times vary. You will receive a notification when your request is reviewed. For urgent access, call support on 0466 663 356.",
      },
      {
        id: "r3",
        question: "Can I cancel a booking?",
        answer:
          "Yes. Open the request from My Requests and tap 'Cancel'. If the keyset is already checked out, you must return it first.",
      },
    ],
  },
  {
    id: "notifications",
    icon: "notifications-outline",
    iconBg: theme.colors.neutralSoft,
    iconColor: theme.colors.neutral,
    title: "Notifications",
    faqs: [
      {
        id: "n1",
        question: "I'm not receiving push notifications.",
        answer:
          "Go to Settings → Notifications and make sure Push Notifications is enabled. Also check your device's notification permissions in System Settings.",
      },
      {
        id: "n2",
        question: "Can I turn off specific notification types?",
        answer:
          "Notification preferences are managed in Settings. Contact support if you need specific alert types adjusted.",
      },
    ],
  },
  {
    id: "admin",
    icon: "settings-outline",
    iconBg: theme.colors.warningSoft,
    iconColor: theme.colors.warning,
    title: "Admin Setup",
    faqs: [
      {
        id: "ad1",
        question: "How do I add a new property?",
        answer:
          "Admins can add properties from the Properties tab by tapping the '+' button and completing the property details form.",
      },
      {
        id: "ad2",
        question: "How do I approve a new agent?",
        answer:
          "Open the Pending Requests screen. Tap on the request and select Approve or Reject.",
      },
      {
        id: "ad3",
        question: "How do I generate and print key tags?",
        answer:
          "Open the Key detail screen, tap More Options, and select 'Print Tag'. PDF generation requires a PDF-capable printer.",
      },
    ],
  },
];

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function Divider({ indent = 0 }: { indent?: number }) {
  return <View style={[styles.divider, { marginLeft: indent }]} />;
}

function QuickActionCard({ item }: { item: QuickAction }) {
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.qaCard, pressed && styles.qaCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.qaIconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={22} color={item.iconColor} />
      </View>
      <Text style={styles.qaTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.qaDesc} numberOfLines={2}>
        {item.description}
      </Text>
    </Pressable>
  );
}

function TopicRow({ item, isLast }: { item: PopularTopic; isLast: boolean }) {
  return (
    <>
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [styles.topicRow, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={styles.topicIconWrap}>
          <Ionicons name={item.icon} size={18} color={theme.colors.accent} />
        </View>
        <Text style={styles.topicTitle}>{item.title}</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textLight}
        />
      </Pressable>
      {!isLast && <Divider indent={52} />}
    </>
  );
}

function AccordionSection({
  section,
  isOpen,
  onToggle,
}: {
  section: BrowseSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.accordionCard}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.accordionHeader,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${section.title}`}
      >
        <View
          style={[styles.accordionIcon, { backgroundColor: section.iconBg }]}
        >
          <Ionicons name={section.icon} size={18} color={section.iconColor} />
        </View>
        <Text style={styles.accordionTitle}>{section.title}</Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.colors.textLight}
        />
      </Pressable>
      {isOpen &&
        section.faqs.map((faq) => (
          <View key={faq.id}>
            <Divider indent={16} />
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          </View>
        ))}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  onPress,
  isLast,
  isDestructive,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  isLast?: boolean;
  isDestructive?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.infoRow, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isDestructive ? theme.colors.danger : theme.colors.textMuted}
        />
        <Text
          style={[
            styles.infoLabel,
            isDestructive && styles.infoLabelDestructive,
          ]}
        >
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={15}
          color={theme.colors.textLight}
        />
      </Pressable>
      {!isLast && <Divider indent={46} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const quickActions = useMemo(() => getQuickActions(router), [router]);
  const popularTopics = useMemo(
    () => getPopularTopics(setSearchQuery),
    [],
  );

  // Hide the Admin Setup section from non-admins
  const visibleSections = isAdmin
    ? BROWSE_SECTIONS
    : BROWSE_SECTIONS.filter((s) => s.id !== "admin");

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filteredTopics = searchQuery.trim()
    ? popularTopics.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : popularTopics;

  const filteredSections = searchQuery.trim()
    ? visibleSections.map((s) => ({
        ...s,
        faqs: s.faqs.filter(
          (f) =>
            f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })).filter(
        (s) =>
          s.faqs.length > 0 ||
          s.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleSections;

  const activeSections = searchQuery.trim()
    ? new Set(filteredSections.map((s) => s.id))
    : openSections;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <Text style={styles.headerSubtitle}>
          Find answers or get in touch with the Happy Landlord team.
        </Text>
      </View>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.textLight}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help topics"
          placeholderTextColor={theme.colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery("")}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textLight}
            />
          </Pressable>
        )}
      </View>

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      {!searchQuery.trim() && (
        <>
          <SectionLabel title="Quick Actions" />
          <View style={styles.qaGrid}>
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} item={action} />
            ))}
          </View>
        </>
      )}

      {/* ── Popular topics ─────────────────────────────────────────────────── */}
      {filteredTopics.length > 0 && (
        <>
          <SectionLabel
            title={searchQuery.trim() ? "Matching Topics" : "Popular Topics"}
          />
          <View style={styles.listCard}>
            {filteredTopics.map((topic, index) => (
              <TopicRow
                key={topic.id}
                item={topic}
                isLast={index === filteredTopics.length - 1}
              />
            ))}
          </View>
        </>
      )}

      {/* ── Browse by topic ────────────────────────────────────────────────── */}
      {filteredSections.length > 0 && (
        <>
          <SectionLabel title="Browse by Topic" />
          <View style={styles.accordionGroup}>
            {filteredSections.map((section) => (
              <AccordionSection
                key={section.id}
                section={section}
                isOpen={activeSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </View>
        </>
      )}

      {/* ── No results ────────────────────────────────────────────────────── */}
      {searchQuery.trim() &&
        filteredTopics.length === 0 &&
        filteredSections.length === 0 && (
          <View style={styles.emptySearch}>
            <Ionicons
              name="search-outline"
              size={36}
              color={theme.colors.textLight}
            />
            <Text style={styles.emptySearchTitle}>No results found</Text>
            <Text style={styles.emptySearchBody}>
              Try a different keyword or browse by topic below.
            </Text>
          </View>
        )}

      {/* ── Contact card ───────────────────────────────────────────────────── */}
      {!searchQuery.trim() && (
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIconWrap}>
              <Ionicons
                name="headset-outline"
                size={20}
                color={theme.colors.accent}
              />
            </View>
            <Text style={styles.contactTitle}>Still need help?</Text>
          </View>
          <Text style={styles.contactBody}>
            Reach the Happy Landlord support team by phone or email.
          </Text>
          <View style={styles.contactBtns}>
            <Pressable
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
              style={({ pressed }) => [
                styles.contactBtn,
                pressed && styles.contactBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Call support ${SUPPORT_PHONE_DISPLAY}`}
            >
              <Ionicons
                name="call-outline"
                size={15}
                color={theme.colors.accent}
              />
              <Text style={styles.contactBtnText}>{SUPPORT_PHONE_DISPLAY}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`,
                ).catch(() =>
                  Alert.alert("Unavailable", "Could not open your mail app."),
                )
              }
              style={({ pressed }) => [
                styles.contactBtn,
                pressed && styles.contactBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Email support"
            >
              <Ionicons
                name="mail-outline"
                size={15}
                color={theme.colors.accent}
              />
              <Text style={styles.contactBtnText}>{SUPPORT_EMAIL}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── App information ────────────────────────────────────────────────── */}
      <SectionLabel title="App Information" />
      <View style={styles.listCard}>
        <View style={styles.versionRow}>
          <Ionicons
            name="phone-portrait-outline"
            size={18}
            color={theme.colors.textMuted}
          />
          <Text style={styles.versionLabel}>Key Manager</Text>
          <Text style={styles.versionValue}>v{APP_VERSION}</Text>
        </View>
        <Divider indent={46} />
        <InfoRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() =>
            WebBrowser.openBrowserAsync(
              "https://happylandlord.com.au/privacy",
            ).catch(() =>
              Alert.alert("Unavailable", "Could not open Privacy Policy."),
            )
          }
        />
        <InfoRow
          icon="reader-outline"
          label="Terms of Use"
          onPress={() =>
            WebBrowser.openBrowserAsync(
              "https://happylandlord.com.au/terms",
            ).catch(() =>
              Alert.alert("Unavailable", "Could not open Terms of Use."),
            )
          }
        />
        <InfoRow
          icon="bug-outline"
          label="Send Diagnostics / Report Bug"
          onPress={() =>
            Alert.alert(
              "Send Diagnostics",
              "Diagnostic data will be sent to the Happy Landlord support team. This may include device info and recent app activity.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Send",
                  onPress: () =>
                    Linking.openURL(
                      `mailto:${TECH_EMAIL}?subject=Diagnostics%20Report%20v${APP_VERSION}`,
                    ).catch(() =>
                      Alert.alert(
                        "Unavailable",
                        "Could not open your mail app.",
                      ),
                    ),
                },
              ],
            )
          }
          isLast
          isDestructive
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {new Date().getFullYear()} Happy Landlord
        </Text>
        <Text style={styles.footerPoweredText}>Powered by Arqon</Text>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl * 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  headerBlock: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    padding: 0,
  },
  qaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  qaCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  qaCardPressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.neutralSoft,
  },
  qaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  qaTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  qaDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  topicIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  topicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  rowPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  accordionGroup: {
    gap: theme.spacing.sm,
  },
  accordionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  faqItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 6,
    backgroundColor: theme.colors.surfaceWarm,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  emptySearch: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptySearchTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  emptySearchBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: theme.spacing.xl,
  },
  contactCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  contactBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  contactBtns: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentSoft,
  },
  contactBtnPressed: {
    opacity: 0.7,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  versionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  versionValue: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  infoLabelDestructive: {
    color: theme.colors.danger,
  },
  footer: {
    alignItems: "center",
    gap: 4,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  footerPoweredText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});
