import { memo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Building2, Camera, MapPin, Pencil } from "lucide-react-native";

import { useRole } from "@/hooks/useRole";
import { usePropertyImageUrls } from "@/hooks/usePropertyImages";
import { theme } from "@/constants/theme";
import type { PropertyWithLandlord } from "@/services/properties.service";
import { getVisibleImages } from "@/services/properties.service";
import { PropertyImageGallery } from "@/components/property/PropertyImageGallery";
import { PropertyEditModal } from "@/components/property/PropertyEditModal";

import { PROPERTY_TYPE_LABEL } from "./propertyLabels";

export type PropertyHeaderProps = {
  property: PropertyWithLandlord;
};

export const PropertyHeader = memo(function PropertyHeader({
  property,
}: PropertyHeaderProps) {
  const { isAdmin } = useRole();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");

  const landlord = property.landlord;

  const images = property.images ?? [];
  const visibleImages = getVisibleImages(images);
  const hasImages = visibleImages.length > 0;

  // Fetch signed URLs for all visible images (cached for 55 min).
  const { data: signedUrls = [] } = usePropertyImageUrls(images);
  const firstSignedUrl = signedUrls[0] ?? null;

  return (
    <View style={styles.header}>
      {/* ── Image banner ──────────────────────────────────────────────────── */}
      {hasImages && firstSignedUrl ? (
        <Pressable
          onPress={() => setGalleryOpen(true)}
          style={({ pressed }) => [
            styles.banner,
            pressed && styles.bannerPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`View ${visibleImages.length} photo${visibleImages.length === 1 ? "" : "s"}`}
        >
          <Image
            source={{ uri: firstSignedUrl }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          {/* Photo count badge */}
          <View style={styles.photoBadge}>
            <Camera size={12} color="#fff" strokeWidth={2} />
            <Text style={styles.photoBadgeText}>{visibleImages.length}</Text>
          </View>
        </Pressable>
      ) : null}

      {/* ── Info row ──────────────────────────────────────────────────────── */}
      <View style={styles.top}>
        {/* Icon — only show when no images */}
        {!hasImages && (
          <View style={styles.iconWrap}>
            <Building2
              size={24}
              color={theme.colors.primary}
              strokeWidth={1.8}
            />
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {PROPERTY_TYPE_LABEL[property.property_type] ??
                property.property_type}
            </Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.locationRow}>
            <MapPin
              size={12}
              color={theme.colors.textLight}
              strokeWidth={1.8}
            />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {isAdmin ? (
          <Pressable
            onPress={() => setEditOpen(true)}
            style={({ pressed }) => [
              styles.editBtn,
              pressed && styles.editBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit property"
            hitSlop={8}
          >
            <Pencil size={16} color={theme.colors.primary} strokeWidth={1.9} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Landlord meta ─────────────────────────────────────────────────── */}
      {landlord ? (
        <View style={styles.metaRow}>
          <View style={styles.metaDivider} />
          <View style={styles.metaContent}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Landlord</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {landlord.full_name || "—"}
              </Text>
            </View>
            {landlord.phone || landlord.email ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Contact</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {landlord.phone ?? landlord.email ?? "—"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Gallery modal ─────────────────────────────────────────────────── */}
      <PropertyImageGallery
        urls={signedUrls.filter(Boolean) as string[]}
        visible={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {isAdmin && (
        <PropertyEditModal
          property={property}
          visible={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },

  // ── Banner ───────────────────────────────────────────────────────────────
  banner: {
    width: "100%",
    height: 180,
  },
  bannerPressed: {
    opacity: 0.9,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  photoBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  photoBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Info row ─────────────────────────────────────────────────────────────
  top: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  editBtnPressed: {
    opacity: 0.6,
  },

  // ── Landlord meta ────────────────────────────────────────────────────────
  metaRow: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  metaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
