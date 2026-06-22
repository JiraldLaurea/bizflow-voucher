"use client";

import { useState } from "react";
import { REQUIRED_CONSENT_TEXT, MARKETING_CONSENT_TEXT } from "@/lib/consent";

export interface ClaimConfig {
  slug: string;
  requireDateTime: boolean;
  collectGuests: boolean;
  collectEmail: boolean;
  branches: { id: string; name: string }[];
  services: { id: string; name: string }[];
  timeSlots: string[];
  businessName: string;
}

function nextDates(count: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric" }).format(d);
    out.push({ value, label });
  }
  return out;
}

export default function ClaimForm({ config }: { config: ClaimConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; smsDelivered: boolean } | null>(null);
  const dates = nextDates(7);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      slug: config.slug,
      name: form.get("name"),
      phone: form.get("phone"),
      email: config.collectEmail ? form.get("email") : "",
      selectedDate: config.requireDateTime ? form.get("selectedDate") : "",
      selectedTime: config.requireDateTime ? form.get("selectedTime") : "",
      branchId: form.get("branchId") || "",
      serviceId: form.get("serviceId") || "",
      guests: config.collectGuests && form.get("guests") ? Number(form.get("guests")) : null,
      requiredConsent: form.get("requiredConsent") === "on",
      marketingConsent: form.get("marketingConsent") === "on",
    };

    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not claim your voucher.");
      return;
    }
    setDone({ code: data.code, smsDelivered: data.smsDelivered });
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <div style={{ fontSize: 40 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Your voucher is confirmed!</h2>
        <div style={{ border: "2px dashed var(--accent)", borderRadius: 10, background: "#eff6ff", padding: "16px 24px", width: "100%" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Voucher code</div>
          <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)" }}>{done.code}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${done.code}`} alt="Voucher QR code" style={{ width: 160, height: 160 }} />
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
          {done.smsDelivered
            ? "We've also sent this code to your mobile by SMS."
            : "Please screenshot this code — show it in-store to redeem."}
        </p>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Show this code or QR at {config.businessName} to redeem.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {config.requireDateTime && (
        <div className="form-grid">
          <label>
            Date
            <select name="selectedDate" required>
              {dates.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label>
            Time
            <select name="selectedTime" required>
              {config.timeSlots.length === 0 && <option value="">—</option>}
              {config.timeSlots.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {config.branches.length > 1 && (
        <label>
          Branch
          <select name="branchId" required>
            <option value="">Select a branch…</option>
            {config.branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      )}
      {config.branches.length === 1 && <input type="hidden" name="branchId" value={config.branches[0].id} />}

      {config.services.length > 0 && (
        <label>
          Service
          <select name="serviceId" required>
            <option value="">Select a service…</option>
            {config.services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Your name
        <input name="name" required />
      </label>
      <label>
        Mobile number
        <input name="phone" placeholder="0917 123 4567" inputMode="tel" required />
      </label>
      {config.collectEmail && (
        <label>
          Email
          <input name="email" type="email" />
        </label>
      )}
      {config.collectGuests && (
        <label>
          Number of guests
          <input name="guests" type="number" min={1} defaultValue={2} />
        </label>
      )}

      <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
          <input name="requiredConsent" type="checkbox" required style={{ marginTop: 2, width: "auto", minHeight: "auto" }} />
          <span>{REQUIRED_CONSENT_TEXT} <strong style={{ color: "var(--danger)" }}>*</strong></span>
        </label>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
          <input name="marketingConsent" type="checkbox" style={{ marginTop: 2, width: "auto", minHeight: "auto" }} />
          <span>{MARKETING_CONSENT_TEXT} <span style={{ color: "var(--muted)", fontStyle: "italic" }}>(optional)</span></span>
        </label>
      </div>

      {error && <div className="notice warning" style={{ padding: "10px 14px", fontSize: 13 }}>{error}</div>}
      <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Claiming…" : "Claim my voucher"}
      </button>
    </form>
  );
}
