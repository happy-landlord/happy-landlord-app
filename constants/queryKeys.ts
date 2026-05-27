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
	byProperty: (propertyId: string) => ["keys", "property", propertyId] as const,
    checkedOut: (scope: string) => ["keys", "checkedOut", scope] as const,
  },
  activity: {
    all: ["activity", "all"] as const,
    mine: (userId: string) => ["activity", "mine", userId] as const,
    infinite: (scope: string, search: string, propertyId?: string) =>
      ["activity", "infinite", scope, search, propertyId ?? ""] as const,
  },
  requests: {
    all: ["requests"] as const,
    pending: ["requests", "pending"] as const,
    mine: ["requests", "mine"] as const,
  },
  notifications: {
    all: (userId: string) => ["notifications", userId] as const,
    unreadCount: (userId: string) => ["notifications", userId, "unreadCount"] as const,
    pushStatus: (userId: string) => ["notifications", userId, "pushStatus"] as const,
  },
};


