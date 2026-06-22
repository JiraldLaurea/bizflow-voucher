"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewBusinessPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create business.");
      return;
    }
    router.push("/businesses");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/businesses" className="hover:text-gray-800">Businesses</Link>
        <span>/</span>
        <span className="text-gray-800">New</span>
      </div>
      <h1 className="mb-5 text-xl font-semibold">New Business</h1>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Business name *</label>
          <input name="name" className="input" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Industry</label>
            <select name="industry" className="input" defaultValue="RESTAURANT">
              <option value="RESTAURANT">Restaurant / Café</option>
              <option value="BEAUTY">Beauty / Skincare</option>
              <option value="PET_CLINIC">Pet Clinic</option>
              <option value="DENTAL">Dental / Wellness</option>
              <option value="RETAIL">Retail</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Subscription plan</label>
            <select name="subscriptionPlan" className="input" defaultValue="STARTER">
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="MANAGED">Managed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First branch name *</label>
            <input name="firstBranchName" className="input" defaultValue="Main Branch" required />
          </div>
          <div>
            <label className="label">Branch count</label>
            <input name="branchCount" type="number" min={1} className="input" defaultValue={1} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contact person</label>
            <input name="contactPerson" className="input" />
          </div>
          <div>
            <label className="label">Contact phone</label>
            <input name="phone" className="input" placeholder="09xx xxx xxxx" />
          </div>
        </div>
        <div>
          <label className="label">Contact email</label>
          <input name="email" type="email" className="input" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create business"}
          </button>
          <Link href="/businesses" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
