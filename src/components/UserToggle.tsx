"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={toggle} disabled={loading} className="text-xs text-brand hover:underline disabled:opacity-50">
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
