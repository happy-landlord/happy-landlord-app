/** Default loan window (hours) applied when an agent checks out keys. */
export const CHECKOUT_DURATION_HOURS = 24;

/** Selectable checkout / extend durations (in days) shown in the duration picker. */
export const DURATION_DAYS = [1, 2, 3, 5, 7] as const;
export type CheckoutDurationDays = (typeof DURATION_DAYS)[number];
