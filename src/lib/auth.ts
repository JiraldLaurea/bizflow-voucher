import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

const COOKIE_NAME = "bizflow_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | null;
  branchId: string | null;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short (set it in .env)");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

/** Read + verify the session from cookies. Returns null if missing/invalid. */
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      businessId: (payload.businessId as string | null) ?? null,
      branchId: (payload.branchId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Verify a session token string (for middleware, which cannot use next/headers). */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
