import { useState } from "react";
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
import * as WebBrowser from "expo-web-browser";

import { theme } from "@/constants/theme";

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
// Static data
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "contact",
    icon: "chatbubble-ellipses-outline",
    iconBg: theme.colors.primarySoft,
    iconColor: theme.colors.primary,
    title: "Contact Manager",
    description: "Send a message to your property manager",
    onPress: () => Alert.alert("Contact Manager", "This feature is coming soon."),
  },
  {
    id: "report",
    icon: "warning-outline",
    iconBg: theme.colors.dangerSoft,
    iconColor: theme.colors.danger,
    title: "Report an Issue",
    description: "Let us know about a problem",
    onPress: () => Alert.alert("Report an Issue", "This feature is coming soon."),
  },
  {
    id: "requests",
    icon: "document-text-outline",
    iconBg: theme.colors.infoSoft,
    iconColor: theme.colors.info,
    title: "My Requests",
    description: "View your access requests & bookings",
    onPress: () => Alert.alert("My Requests", "Navigate to requests screen."),
  },
  {
    id: "emergency",
    icon: "shield-outline",
    iconBg: theme.colors.warningSoft,
    iconColor: theme.colors.warning,
    title: "Emergency Help",
    description: "Locked out or unsafe? Get help now",
    onPress: () =>
      Alert.alert(
        "Emergency Help",
        "If you are in immediate danger, call 000. Otherwise contact your property manager directly.",
        [
          { text: "Call 000", onPress: () => Linking.openURL("tel:000"), style: "destructive" },
          { text: "Close", style: "cancel" },
        ],
      ),
  },
];

const POPULAR_TOPICS: PopularTopic[] = [
  {
    id: "scanner",
    icon: "scan-outline",
    title: "Scanner not working",
    onPress: () => Alert.alert("Scanner not working", "Help article coming soon."),
  },
  {
    id: "missing-key",
    icon: "key-outline",
    title: "Key is missing",
    onPress: () => Alert.alert("Key is missing", "Help article coming soon."),
  },
  {
    id: "access",
    icon: "lock-closed-outline",
    title: "I can't access a property",
    onPress: () => Alert.alert("Can't access a property", "Help article coming soon."),
  },
  {
    id: "return",
    icon: "return-down-back-outline",
    title: "How to return a key",
    onPress: () => Alert.alert("How to return a key", "Help article coming soon."),
  },
  {
    id: "password",
    icon: "eye-off-outline",
    title: "Forgot password",
    onPress: () => Alert.alert("Forgot password", "Help article coming soon."),
  },
  {
    id: "notifications",
    icon: "notifications-off-outline",
    title: "Notifications not showing",
    onPress: () => Alert.alert("Notifications not showing", "Help article coming soon."),
  },
];

const BROWSE_SECTIONS: BrowseSection[] = [
  {
    id: "account",
    icon: "person-circle-outline",
    iconBg: theme.colors.primarySoft,
    iconColor: theme.colors.primary,
    title: "Account & Login",
    faqs: [
      {
        id: "a1",
        question: "How do I reset my password?",
        answer: 'Tap "Forgot password" on the login screen and follow the email link to create a new password.',
      },
      {
        id: "a2",
        question: "How do I enable biometric login?",
        answer: "Go to Settings → Security and toggle on Face ID / Fingerprint login.",
      },
      {
        id: "a3",
        question: "Why is my account pending approval?",
        answer: "New accounts require approval from your property manager before you can access keys and properties.",
      },
    ],
  },
  {
    id: "keys",
    icon: "key-outline",
    iconBg: theme.colors.accentSoft,
    iconColor: theme.colors.accentDark,
    title: "Keys & Access",
    faqs: [
      {
        id: "k1",
        question: "How do I check out a key?",
        answer: "Scan the QR or NFC tag on the key, then confirm checkout. The key will be assigned to you.",
      },
      {
        id: "k2",
        question: "How do I return a key?",
        answer: "Scan the key tag again while it is checked out to you. Confirm the return to complete the handover.",
      },
      {
        id: "k3",
        question: "What does 'overdue' mean?",
        answer: "A key is overdue when its scheduled return date has passed and it has not been returned. Contact your manager.",
      },
      {
        id: "k4",
        question: "How do I report a lost key?",
        answer: "Open the key detail screen, tap the options menu, and select 'Report Lost'. Your manager will be notified.",
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
        answer: "Ensure the tag is clean and undamaged. Hold your phone steady, 5–10 cm from the tag. Check that camera permissions are enabled in Settings.",
      },
      {
        id: "s2",
        question: "Can I scan NFC and QR codes?",
        answer: "Yes. The scanner supports both QR codes via the camera and NFC tags by tapping your phone against the tag.",
      },
      {
        id: "s3",
        question: "My phone doesn't support NFC. Can I still use the app?",
        answer: "Yes. You can use QR code scanning instead. All key tags include a QR code as a fallback.",
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
        question: "How does a key handover work?",
        answer: "The current holder initiates a handover, and the recipient scans the key tag to accept and confirm transfer.",
      },
      {
        id: "c2",
        question: "Can I hand a key to someone who isn't in the app?",
        answer: "No. Both parties must have an active account. The recipient must be registered and approved.",
      },
      {
        id: "c3",
        question: "What happens if a handover is not confirmed?",
        answer: "The key remains assigned to the original holder until the recipient scans and confirms. Contact your manager if you are stuck.",
      },
    ],
  },
  {
    id: "requests",
    icon: "calendar-outline",
    iconBg: theme.colors.primarySoft,
    iconColor: theme.colors.primaryDark,
    title: "Requests & Bookings",
    faqs: [
      {
        id: "r1",
        question: "How do I request access to a property?",
        answer: "Go to the property listing and tap 'Request Access'. Your manager will review and approve or decline.",
      },
      {
        id: "r2",
        question: "How long does approval take?",
        answer: "Approval times depend on your property manager. You will receive a notification when your request is reviewed.",
      },
      {
        id: "r3",
        question: "Can I cancel a booking?",
        answer: "Yes. Open the request from My Requests and tap 'Cancel'. If the key is already checked out, you must return it first.",
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
        answer: "Go to Settings → Notifications and make sure Push Notifications is enabled. Also check your device's notification permissions in System Settings.",
      },
      {
        id: "n2",
        question: "Can I turn off specific notification types?",
        answer: "Notification preferences are managed in Settings. Your property manager may control some alert types.",
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
        answer: "Admins can add properties from the Properties tab by tapping the '+' button and completing the property details form.",
      },
      {
        id: "ad2",
        question: "How do I approve a new agent?",
        answer: "Open the Pending Requests screen. Tap on the request and select Approve or Reject.",
      },
      {
        id: "ad3",
        question: "How do I generate and print key tags?",
        answer: "Open the Key detail screen, tap More Options, and select 'Print Tag'. PDF generation requires a PDF-capable printer.",
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
      <Text style={styles.qaTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.qaDesc} numberOfLines={2}>{item.description}</Text>
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
          <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
        </View>
        <Text style={styles.topicTitle}>{item.title}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} />
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
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${section.title}`}
      >
        <View style={[styles.accordionIcon, { backgroundColor: section.iconBg }]}>
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
        <Text style={[styles.infoLabel, isDestructive && styles.infoLabelDestructive]}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={15} color={theme.colors.textLight} />
      </Pressable>
      {!isLast && <Divider indent={46} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const filteredTopics = searchQuery.trim()
    ? POPULAR_TOPICS.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : POPULAR_TOPICS;

  const filteredSections = searchQuery.trim()
    ? BROWSE_SECTIONS.map((s) => ({
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
    : BROWSE_SECTIONS;

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
          Find answers, report issues, or contact your property manager.
        </Text>
      </View>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textLight} />
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
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={theme.colors.textLight} />
          </Pressable>
        )}
      </View>

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      {!searchQuery.trim() && (
        <>
          <SectionLabel title="Quick Actions" />
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard key={action.id} item={action} />
            ))}
          </View>
        </>
      )}

      {/* ── Popular topics ─────────────────────────────────────────────────── */}
      {filteredTopics.length > 0 && (
        <>
          <SectionLabel title={searchQuery.trim() ? "Matching Topics" : "Popular Topics"} />
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
      {searchQuery.trim() && filteredTopics.length === 0 && filteredSections.length === 0 && (
        <View style={styles.emptySearch}>
          <Ionicons name="search-outline" size={36} color={theme.colors.textLight} />
          <Text style={styles.emptySearchTitle}>No results found</Text>
          <Text style={styles.emptySearchBody}>
            Try a different keyword or browse by topic below.
          </Text>
        </View>
      )}

      {/* ── Emergency card ─────────────────────────────────────────────────── */}
      {!searchQuery.trim() && (
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyIconWrap}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.danger} />
            </View>
            <Text style={styles.emergencyTitle}>Urgent issue?</Text>
          </View>
          <Text style={styles.emergencyBody}>
            If you are locked out, feel unsafe, or there is an emergency at the property,
            contact your property manager or emergency services directly.
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Emergency Services",
                "If this is a life-threatening emergency, call 000.",
                [
                  { text: "Call 000", onPress: () => Linking.openURL("tel:000"), style: "destructive" },
                  { text: "Close", style: "cancel" },
                ],
              )
            }
            style={({ pressed }) => [styles.emergencyBtn, pressed && styles.emergencyBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Get emergency help"
          >
            <Ionicons name="call-outline" size={15} color={theme.colors.danger} />
            <Text style={styles.emergencyBtnText}>Get Emergency Help</Text>
          </Pressable>
        </View>
      )}

      {/* ── App information ────────────────────────────────────────────────── */}
      <SectionLabel title="App Information" />
      <View style={styles.listCard}>
        <View style={styles.versionRow}>
          <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.versionLabel}>Happy Landlord</Text>
          <Text style={styles.versionValue}>v{APP_VERSION}</Text>
        </View>
        <Divider indent={46} />
        <InfoRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() =>
            WebBrowser.openBrowserAsync("https://happylandlord.com.au/privacy").catch(() =>
              Alert.alert("Unavailable", "Could not open Privacy Policy."),
            )
          }
        />
        <InfoRow
          icon="reader-outline"
          label="Terms of Use"
          onPress={() =>
            WebBrowser.openBrowserAsync("https://happylandlord.com.au/terms").catch(() =>
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
                { text: "Send", onPress: () => Alert.alert("Thank you", "Diagnostic report submitted.") },
              ],
            )
          }
          isLast
          isDestructive
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Happy Landlord · v{APP_VERSION} · © {new Date().getFullYear()} Arqon
        </Text>
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
    backgroundColor: theme.colors.primarySoft,
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
  emergencyCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: "#F5C6C6",
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  emergencyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: "#FBEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  emergencyBody: {
    fontSize: 13,
    color: "#8B3A3A",
    lineHeight: 20,
  },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surface,
  },
  emergencyBtnPressed: {
    backgroundColor: theme.colors.dangerSoft,
  },
  emergencyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.danger,
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
});
