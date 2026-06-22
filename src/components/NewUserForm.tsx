"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface BranchOption {
  id: string;
  name: string;
}
export interface BusinessOption {
  id: string;
  name: string;
  branches: BranchOption[];
}

export default function NewUserForm({
  isAdmin,
  businesses,
  ownBusinessId,
}: {
  isAdmin: boolean;
  businesses: BusinessOption[];
  ownBusinessId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(isAdmin ? "BUSINESS_OWNER" : "STORE_STAFF");
  const [businessId, setBusinessId] = useState(isAdmin ? (businesses[0]?.id ?? "") : ownBusinessId ?? "");

  const needsBusiness = role !== "PLATFORM_ADMIN";
  const needsBranch = role === "BRANCH_MANAGER" || role === "STORE_STAFF";

  const branches = useMemo(
    () => businesses.find((b) => b.id === businessId)?.branches ?? [],
    [businesses, businessId]
  );

  const roleOptions = isAdmin
    ? ["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR", "BRANCH_MANAGER", "STORE_STAFF"]
    : ["CAMPAIGN_OPERATOR", "BRANCH_MANAGER", "STORE_STAFF"];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role,
      businessId: needsBusiness ? businessId : "",
      branchId: needsBranch ? form.get("branchId") : "",
    };
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create user.");
      return;
    }
    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name *</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" className="input" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Password * (min 8 chars)</label>
          <input name="password" type="password" className="input" minLength={8} required />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {needsBusiness && isAdmin && (
        <div>
          <label className="label">Business</label>
          <select className="input" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {needsBranch && (
        <div>
          <label className="label">Branch</label>
          <select name="branchId" className="input" required>
            <option value="">Select a branch…</option>
            {branches.map((br) => (
              <option key={br.id} value={br.id}>{br.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create user"}
        </button>
        <Link href="/users" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
