"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_ACTIONS: Record<string, { label: string; status: string; style: string }[]> = {
  DRAFT: [{ label: "Activate", status: "ACTIVE", style: "btn-primary" }],
  ACTIVE: [
    { label: "Pause", status: "PAUSED", style: "btn-secondary" },
    { label: "End", status: "ENDED", style: "btn-secondary" },
  ],
  PAUSED: [
    { label: "Resume", status: "ACTIVE", style: "btn-primary" },
    { label: "End", status: "ENDED", style: "btn-secondary" },
  ],
  ENDED: [],
};

export default function CampaignStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const actions = NEXT_ACTIONS[status] ?? [];

  async function setStatus(next: string) {
    setLoading(true);
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (next === "ENDED") {
      router.push("/campaigns");
    } else {
      router.refresh();
    }
  }

  if (actions.length === 0) return null;
  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <button key={a.status} className={a.style} disabled={loading} onClick={() => setStatus(a.status)}>
          {a.label}
        </button>
      ))}
    </div>
  );
}
