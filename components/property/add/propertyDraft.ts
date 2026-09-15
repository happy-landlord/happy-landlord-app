import { fetchSignedPropertyImageUrl } from "@/lib/services";
import type { DbProperty, JsonObject } from "@/types";
import type {
  KeyEntry,
  KeySetDraft,
  PropertyStep,
} from "./useAddPropertyWizard";

export const PROPERTY_DRAFT_SCHEMA_VERSION = 1;

type PersistedProperty = Omit<PropertyStep, "dateReceived"> & {
  dateReceived: string;
};

type PersistedKeySet = Omit<KeySetDraft, "photoUris" | "photoPaths"> & {
  photoPaths: string[];
};

type PropertyDraftSnapshot = {
  version: 1;
  step: number;
  property: PersistedProperty;
  keys: KeyEntry[];
  keySets: PersistedKeySet[];
};

export function serializePropertyDraft(
  property: PropertyStep,
  keys: KeyEntry[],
  keySets: KeySetDraft[],
  step: number,
): JsonObject {
  return {
    version: PROPERTY_DRAFT_SCHEMA_VERSION,
    step,
    property: {
      ...property,
      dateReceived: property.dateReceived.toISOString(),
    } as unknown as JsonObject,
    keys: keys as unknown as JsonObject[],
    keySets: keySets.map(
      ({ photoUris: _photoUris, photoPaths, ...keySet }) => ({
        ...keySet,
        photoPaths: photoPaths.filter((path): path is string => Boolean(path)),
      }),
    ) as unknown as JsonObject[],
  };
}

export async function restorePropertyDraft(draft: DbProperty): Promise<{
  property: PropertyStep;
  keys: KeyEntry[];
  keySets: KeySetDraft[];
  step: number;
}> {
  if (!draft.draft_data) {
    throw new Error("This property draft has no saved form data.");
  }

  const snapshot = draft.draft_data as unknown as PropertyDraftSnapshot;
  if (snapshot.version !== PROPERTY_DRAFT_SCHEMA_VERSION) {
    throw new Error("This draft was created by an unsupported app version.");
  }

  if (
    !snapshot.property ||
    !Array.isArray(snapshot.keys) ||
    !Array.isArray(snapshot.keySets)
  ) {
    throw new Error("This property draft is incomplete or damaged.");
  }

  const keySets = await Promise.all(
    snapshot.keySets.map(async (keySet) => {
      const photoPaths = Array.isArray(keySet.photoPaths)
        ? keySet.photoPaths
        : [];
      const signedUris = await Promise.all(
        photoPaths.map((path) => fetchSignedPropertyImageUrl(path)),
      );
      if (signedUris.some((uri) => !uri)) {
        throw new Error("One or more draft photos could not be loaded.");
      }

      return {
        ...keySet,
        photoUris: signedUris as string[],
        photoPaths,
      };
    }),
  );

  return {
    property: {
      ...snapshot.property,
      dateReceived: new Date(snapshot.property.dateReceived),
    },
    keys: snapshot.keys,
    keySets,
    step:
      Number.isInteger(snapshot.step) &&
      snapshot.step >= 1 &&
      snapshot.step <= 3
        ? snapshot.step
        : 1,
  };
}
