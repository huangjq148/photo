/** Invite status constants — used instead of raw strings */
export const INVITE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

export type InviteStatus = (typeof INVITE_STATUS)[keyof typeof INVITE_STATUS];

export const INVITE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
