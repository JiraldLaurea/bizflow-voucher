import { customAlphabet } from "nanoid";

// Unique voucher code generation (Business Plan §15.1 feature 9).
// Human-readable, no ambiguous chars (no 0/O/1/I), uppercase.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomPart = customAlphabet(ALPHABET, 6);

/** Build a code like "VINE-8F32QK". Uniqueness is enforced by the DB; callers retry on collision. */
export function generateVoucherCode(prefix: string): string {
  const clean = (prefix || "VCH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "VCH";
  return `${clean}-${randomPart()}`;
}
