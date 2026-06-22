"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed.");
      return;
    }
    const next = params.get("next") || "/dashboard";
    router.push(next);
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>BizFlow Voucher Engine</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Sign in to your dashboard</div>
        </div>

        <div className="panel">
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error && (
              <div className="notice warning" style={{ padding: "10px 14px", fontSize: 13 }}>{error}</div>
            )}
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          <div style={{ marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, textAlign: "center" }}>Demo accounts</div>
          <div style={{ background: "white", borderRadius: 8, border: "1px solid var(--line)", overflow: "hidden" }}>
            {[
              { role: "Platform Admin", email: "admin@bizflow.test", password: "admin1234" },
              { role: "Business Owner", email: "owner@vinepatio.test", password: "owner1234" },
              { role: "Store Staff", email: "staff@vinepatio.test", password: "staff1234" },
            ].map((a, i) => (
              <div key={a.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <span style={{ color: "var(--muted)", minWidth: 100 }}>{a.role}</span>
                <span style={{ fontFamily: "monospace", color: "var(--ink)" }}>{a.email}</span>
                <span style={{ fontFamily: "monospace", color: "var(--muted)" }}>{a.password}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
