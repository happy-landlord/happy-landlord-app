export const QUERY_KEYS = {
  auth: {
    session: ["auth", "session"] as const,
    profile: (userId: string) => ["auth", "profile", userId] as const,
  },
  properties: {
    all: ["properties"] as const,
    detail: (id: string) => ["properties", id] as const,
    infinite: (search: string, keyStatus: string) =>
      ["properties", "infinite", search, keyStatus] as const,
  },
  keys: {
    all: ["keys"] as const,
    detail: (id: string) => ["keys", id] as const,
    byProperty: (propertyId: string) =>
      ["keys", "property", propertyId] as const,
    checkedOut: (scope: string) => ["keys", "checkedOut", scope] as const,
  },
  keySets: {
    all: ["keySets"] as const,
    detail: (id: string) => ["keySets", id] as const,
    byProperty: (propertyId: string) =>
      ["keySets", "property", propertyId] as const,
    unassigned: (propertyId: string) =>
      ["keySets", "unassigned", propertyId] as const,
  },
  activity: {
    all: ["activity", "all"] as const,
    mine: (userId: string) => ["activity", "mine", userId] as const,
    infinite: (
      scope: string,
      search: string,
      propertyId?: string,
      keySetId?: string,
      myActivityOnly?: boolean,
      dateFrom?: string,
      dateTo?: string,
    ) =>
      [
        "activity",
        "infinite",
        scope,
        search,
        propertyId ?? "",
        keySetId ?? "",
        myActivityOnly ? "1" : "0",
        dateFrom ?? "",
        dateTo ?? "",
      ] as const,
  },
  agents: {
    all: ["agents"] as const,
  },
  requests: {
    all: ["requests"] as const,
    mine: ["requests", "mine"] as const,
  },
  notifications: {
    all: (userId: string) => ["notifications", userId] as const,
    unreadCount: (userId: string) =>
      ["notifications", userId, "unreadCount"] as const,
    pushStatus: (userId: string) =>
      ["notifications", userId, "pushStatus"] as const,
  },
  storage: {
    /** Signed URL for a single storage path. */
    signedUrl: (path: string) => ["storage", "signedUrl", path] as const,
    /** Signed URLs for a set of paths (e.g. all images of one property). */
    signedUrls: (paths: string[]) =>
      ["storage", "signedUrls", ...paths] as const,
  },
  reservations: {
    forKeySet: (keySetId: string) =>
      ["reservations", "keySet", keySetId] as const,
    mine: (profileId: string) => ["reservations", "mine", profileId] as const,
  },
  dashboard: {
    counts: ["dashboard", "counts"] as const,
    attention: (userId: string) => ["dashboard", "attention", userId] as const,
  },
};
