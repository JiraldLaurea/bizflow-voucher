import type { UserRole } from "@prisma/client";
import { getSession, type SessionUser } from "./auth";

// Role-based access (Business Plan §16.3)
// Store staff see the minimum needed to validate a voucher.

export const ADMIN_ROLES: UserRole[] = ["PLATFORM_ADMIN"];
export const BUSINESS_MANAGEMENT_ROLES: UserRole[] = [
  "PLATFORM_ADMIN",
  "BUSINESS_OWNER",
  "CAMPAIGN_OPERATOR",
];
export const VALIDATION_ROLES: UserRole[] = [
  "PLATFORM_ADMIN",
  "BUSINESS_OWNER",
  "BRANCH_MANAGER",
  "STORE_STAFF",
];

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Require an authenticated user; throws AuthError if none. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError("Not authenticated", 401);
  return user;
}

/** Require an authenticated user whose role is in `roles`. */
export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

/** True if `user` may access data scoped to `businessId`. */
export function canAccessBusiness(user: SessionUser, businessId: string): boolean {
  if (user.role === "PLATFORM_ADMIN") return true;
  return user.businessId === businessId;
}

/**
 * `where` fragment for models that have a `businessId` column (Campaign, User,
 * Voucher relations…). Platform admins see all; everyone else is scoped.
 */
export function businessScope(user: SessionUser): { businessId?: string } {
  if (user.role === "PLATFORM_ADMIN") return {};
  return { businessId: user.businessId ?? "__none__" };
}

/**
 * `where` fragment for the Business model itself, which is keyed on `id`.
 */
export function businessRecordScope(user: SessionUser): { id?: string } {
  if (user.role === "PLATFORM_ADMIN") return {};
  return { id: user.businessId ?? "__none__" };
}
