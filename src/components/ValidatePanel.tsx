"use client";

import { useState } from "react";
import { dateShort } from "@/lib/format";

interface VoucherView {
  code: string;
  benefit: string;
  condition: string | null;
  status: string;
  expiryDate: string;
  businessName: string;
  campaignName: string;
  customerName: string;
  selectedDate: string | null;
  selectedTime: string | null;
  branchName: string | null;
  serviceName: string | null;
}

const RESULT_CONFIG: Record<string, { text: string; bg: string; border: string; color: string }> = {
  VALID:        { text: "✓ Valid — ready to redeem", bg: "#dcfce7", border: "#86efac", color: "#15803d" },
  ALREADY_USED: { text: "Already used",              bg: "#fee2e2", border: "#fca5a5", color: "#b91c1c" },
  EXPIRED:      { text: "Expired",                   bg: "#fee2e2", border: "#fca5a5", color: "#b91c1c" },
  WRONG_BRANCH: { text: "Wrong branch",              bg: "#fef3c7", border: "#fde68a", color: "#b45309" },
  NOT_YET_ACTIVE:{ text: "Not yet active",           bg: "#fef3c7", border: "#fde68a", color: "#b45309" },
  CANCELLED:    { text: "Cancelled",                 bg: "#f1f5f9", border: "#d7dce3", color: "#536275" },
  NOT_FOUND:    { text: "Not found",                 bg: "#f1f5f9", border: "#d7dce3", color: "#536275" },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function ValidatePanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<VoucherView | null>(null);
  const [orderValue, setOrderValue] = useState("");
  const [notes, setNotes] = useState("");
  const [redeemed, setRedeemed] = useState(false);

  function reset() {
    setResult(null);
    setVoucher(null);
    setError(null);
    setRedeemed(false);
    setOrderValue("");
    setNotes("");
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    reset();
    const res = await fetch("/api/vouchers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Validation failed.");
      return;
    }
    setResult(data.result);
    setVoucher(data.voucher ?? null);
  }

  async function redeem() {
    if (!voucher) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/vouchers/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: voucher.code, orderValue: orderValue ? Number(orderValue) : null, notes: notes || null }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setError(data.message ?? data.error ?? "Could not redeem.");
      setResult(data.result ?? result);
      return;
    }
    setRedeemed(true);
    setResult("USED");
  }

  const cfg = result ? RESULT_CONFIG[result] : null;

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16, fontSize: 16 }}>Look up voucher</h2>
        <form onSubmit={check} style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1, display: "grid", gap: 0 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Voucher code or 09171234567…"
              autoFocus
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
            {loading ? "…" : "Check"}
          </button>
        </form>
        {error && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--danger)" }}>{error}</p>}
      </div>

      {cfg && (
        <div style={{ borderRadius: 8, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, padding: "14px 16px", fontWeight: 600, marginBottom: 16 }}>
          {cfg.text}
        </div>
      )}

      {voucher && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 0 }}>Voucher details</h2>
          <DetailRow label="Code" value={<span style={{ fontFamily: "monospace", fontWeight: 700 }}>{voucher.code}</span>} />
          <DetailRow label="Benefit" value={voucher.benefit} />
          {voucher.condition && <DetailRow label="Condition" value={voucher.condition} />}
          <DetailRow label="Customer" value={voucher.customerName} />
          {voucher.serviceName && <DetailRow label="Service" value={voucher.serviceName} />}
          {voucher.branchName && <DetailRow label="Branch" value={voucher.branchName} />}
          {voucher.selectedDate && (
            <DetailRow label="Booking" value={`${dateShort(voucher.selectedDate)} ${voucher.selectedTime ?? ""}`} />
          )}
          <DetailRow label="Expires" value={dateShort(voucher.expiryDate)} />
          <DetailRow label="Status" value={voucher.status} />
        </div>
      )}

      {result === "VALID" && voucher && !redeemed && (
        <div className="panel">
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Redeem voucher</h2>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <label>
              Order amount (₱, optional)
              <input type="number" min={0} value={orderValue} onChange={(e) => setOrderValue(e.target.value)} />
            </label>
            <label>
              Notes (optional)
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <button onClick={redeem} className="btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Redeeming…" : "Mark voucher as used"}
          </button>
        </div>
      )}

      {redeemed && (
        <div style={{ borderRadius: 8, border: "1px solid #86efac", background: "#dcfce7", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#15803d", marginBottom: 12 }}>Voucher redeemed</div>
          <button
            onClick={() => { setQuery(""); reset(); }}
            className="btn-secondary"
            style={{ fontSize: 13 }}
          >
            Validate another
          </button>
        </div>
      )}
    </div>
  );
}
