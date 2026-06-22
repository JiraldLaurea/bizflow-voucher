import { parsePhoneNumberFromString } from "libphonenumber-js";

// Phone number validation (Business Plan §15.1 feature 7).
// Default region is the Philippines; accepts local (09xx) and +63 formats.

export interface PhoneResult {
  ok: boolean;
  e164?: string;
  error?: string;
}

export function normalizePhone(input: string, defaultRegion: "PH" = "PH"): PhoneResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Phone number is required" };

  const parsed = parsePhoneNumberFromString(raw, defaultRegion);
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: "Enter a valid mobile number (e.g. 0917 123 4567)" };
  }
  return { ok: true, e164: parsed.number };
}
