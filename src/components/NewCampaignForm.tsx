"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BusinessOption } from "@/components/NewUserForm";

interface ServiceOption {
  id: string;
  name: string;
}
interface BusinessWithServices extends BusinessOption {
  services: ServiceOption[];
}

const DEFAULT_SMS =
  "[{{business}}] Your {{benefit}} voucher is confirmed. Code: {{code}}. Date: {{datetime}}. Show this SMS in-store. Valid until {{expiry}}.";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export default function NewCampaignForm({ businesses }: { businesses: BusinessWithServices[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [timeSlotsRaw, setTimeSlotsRaw] = useState("18:00, 19:00, 20:00");

  const selected = useMemo(() => businesses.find((b) => b.id === businessId), [businesses, businessId]);

  function onNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const payload = {
      businessId,
      name,
      slug,
      channel: form.get("channel"),
      offerTitle: form.get("offerTitle"),
      offerDescription: form.get("offerDescription"),
      voucherBenefit: form.get("voucherBenefit"),
      minPurchase: form.get("minPurchase") || 0,
      voucherLimitTotal: form.get("voucherLimitTotal"),
      voucherLimitDaily: form.get("voucherLimitDaily") ? Number(form.get("voucherLimitDaily")) : null,
      timeSlotLimit: form.get("timeSlotLimit") ? Number(form.get("timeSlotLimit")) : null,
      firstTimeOnly: form.get("firstTimeOnly") === "on",
      redemptionRules: form.get("redemptionRules"),
      voucherPrefix: form.get("voucherPrefix") || "VCH",
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      collectGuests: form.get("collectGuests") === "on",
      collectEmail: form.get("collectEmail") === "on",
      requireDateTime: form.get("requireDateTime") === "on",
      branchIds,
      serviceIds,
      timeSlots: timeSlotsRaw.split(",").map((s) => s.trim()).filter(Boolean),
      smsTemplate: form.get("smsTemplate"),
    };

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create campaign.");
      return;
    }
    const data = await res.json();
    router.push(`/campaigns/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Basics */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Campaign basics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Business</label>
            <select className="input" value={businessId} onChange={(e) => { setBusinessId(e.target.value); setBranchIds([]); setServiceIds([]); }}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Channel</label>
            <select name="channel" className="input" defaultValue="FB">
              <option value="DIRECT">Direct / QR link</option>
              <option value="FB">Facebook</option>
              <option value="IG">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="GOOGLE">Google</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Campaign name *</label>
            <input className="input" value={name} onChange={(e) => onNameChange(e.target.value)} required />
          </div>
          <div>
            <label className="label">Landing page slug *</label>
            <input
              className="input"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              required
            />
            <p className="mt-1 text-xs text-gray-400">/claim/{slug || "your-slug"}</p>
          </div>
        </div>
      </section>

      {/* Offer */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Offer</h2>
        <div>
          <label className="label">Offer title *</label>
          <input name="offerTitle" className="input" placeholder="₱300 OFF your weekend dinner" required />
        </div>
        <div>
          <label className="label">Offer description</label>
          <textarea name="offerDescription" className="input" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Voucher benefit *</label>
            <input name="voucherBenefit" className="input" placeholder="₱300 off dinner" required />
          </div>
          <div>
            <label className="label">Minimum purchase (₱)</label>
            <input name="minPurchase" type="number" min={0} className="input" defaultValue={0} />
          </div>
        </div>
      </section>

      {/* Voucher rules (feature 3) */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Voucher rules</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Total limit *</label>
            <input name="voucherLimitTotal" type="number" min={1} className="input" defaultValue={100} required />
          </div>
          <div>
            <label className="label">Daily limit</label>
            <input name="voucherLimitDaily" type="number" min={1} className="input" placeholder="none" />
          </div>
          <div>
            <label className="label">Per time-slot limit</label>
            <input name="timeSlotLimit" type="number" min={1} className="input" placeholder="none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Code prefix</label>
            <input name="voucherPrefix" className="input" maxLength={6} defaultValue="VCH" />
          </div>
          <label className="mt-7 flex items-center gap-2 text-sm">
            <input name="firstTimeOnly" type="checkbox" /> First-time customers only
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start date *</label>
            <input name="startDate" type="datetime-local" className="input" required />
          </div>
          <div>
            <label className="label">End date * (also voucher expiry)</label>
            <input name="endDate" type="datetime-local" className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Redemption rules / notes</label>
          <input name="redemptionRules" className="input" placeholder="e.g. Dine-in only, not combinable" />
        </div>
      </section>

      {/* Landing page config (feature 4) */}
      <section className="card space-y-4">
        <h2 className="font-semibold">Landing page</h2>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input name="requireDateTime" type="checkbox" defaultChecked /> Require date &amp; time
          </label>
          <label className="flex items-center gap-2">
            <input name="collectGuests" type="checkbox" /> Collect number of guests
          </label>
          <label className="flex items-center gap-2">
            <input name="collectEmail" type="checkbox" /> Collect email
          </label>
        </div>

        {selected && selected.branches.length > 0 && (
          <div>
            <label className="label">Available branches (none selected = all)</label>
            <div className="flex flex-wrap gap-2">
              {selected.branches.map((br) => (
                <button
                  type="button"
                  key={br.id}
                  onClick={() => toggle(branchIds, setBranchIds, br.id)}
                  className={`badge border ${branchIds.includes(br.id) ? "border-brand bg-brand/10 text-brand" : "border-gray-300 text-gray-600"}`}
                >
                  {br.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && selected.services.length > 0 && (
          <div>
            <label className="label">Selectable services (none = no service selector)</label>
            <div className="flex flex-wrap gap-2">
              {selected.services.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggle(serviceIds, setServiceIds, s.id)}
                  className={`badge border ${serviceIds.includes(s.id) ? "border-brand bg-brand/10 text-brand" : "border-gray-300 text-gray-600"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Time slots (comma-separated)</label>
          <input className="input" value={timeSlotsRaw} onChange={(e) => setTimeSlotsRaw(e.target.value)} />
        </div>
      </section>

      {/* SMS (feature 10) */}
      <section className="card space-y-4">
        <h2 className="font-semibold">SMS template</h2>
        <p className="text-xs text-gray-500">
          Placeholders: {"{{business}}"} {"{{benefit}}"} {"{{code}}"} {"{{datetime}}"} {"{{expiry}}"}
        </p>
        <textarea name="smsTemplate" className="input" rows={3} defaultValue={DEFAULT_SMS} required />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create campaign (Draft)"}
        </button>
        <Link href="/campaigns" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
