export const QUERY_KEYS = {
  auth: {
	session: ["auth", "session"] as const,
	profile: ["auth", "profile"] as const,
  },
  properties: {
	all: ["properties"] as const,
	detail: (id: string) => ["properties", id] as const,
  },
  keys: {
	all: ["keys"] as const,
	detail: (id: string) => ["keys", id] as const,
	movements: ["keys", "movements"] as const,
	byProperty: (propertyId: string) => ["keys", "property", propertyId] as const,
  },
  activity: {
    all: ["activity", "all"] as const,
    mine: (userId: string) => ["activity", "mine", userId] as const,
  },
};


