"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      style={{ padding: "8px 12px", fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%", borderRadius: 8 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f2f2f2")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      Sign out
    </button>
  );
}
