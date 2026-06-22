"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONFIRM_WORD = "RESET";

export default function ResetDemoButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReset = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  function cancel() {
    setConfirming(false);
    setConfirmText("");
  }

  async function runReset() {
    if (!canReset) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed.");
      } else {
        setMessage(
          `Demo data restored — ${data.businesses} businesses, ${data.campaigns} campaigns, ${data.users} users.`
        );
        setConfirming(false);
        setConfirmText("");
        router.refresh();
      }
    } catch {
      setError("Reset request failed. Is the server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!confirming ? (
        <button type="button" className="button danger" onClick={() => setConfirming(true)}>
          Reset demo data
        </button>
      ) : (
        <div style={{ maxWidth: 360 }}>
          <label style={{ marginBottom: 12 }}>
            Type <strong style={{ color: "var(--danger)" }}>{CONFIRM_WORD}</strong> to confirm
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canReset && !busy) runReset();
              }}
              placeholder={CONFIRM_WORD}
              autoFocus
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="actions">
            <button type="button" className="button danger" disabled={busy || !canReset} onClick={runReset}>
              {busy ? "Resetting…" : "Wipe & re-seed"}
            </button>
            <button type="button" className="button secondary" disabled={busy} onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="notice" style={{ marginTop: 12 }}>
          {message}
        </p>
      )}
      {error && (
        <p className="notice warning" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
