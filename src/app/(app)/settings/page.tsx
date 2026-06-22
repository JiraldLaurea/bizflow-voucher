import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ResetDemoButton from "@/components/ResetDemoButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "PLATFORM_ADMIN") redirect("/dashboard");

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Settings</h1>
          <p>Platform administration</p>
        </div>
      </div>

      <section className="panel">
        <h2>Reset demo data</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5, maxWidth: 560 }}>
          Wipes <strong>all</strong> businesses, campaigns, leads, vouchers, redemptions, SMS logs, and
          non-admin users, then re-creates the original 3 sample pilot businesses and campaigns. Your
          platform-admin account is preserved. This cannot be undone.
        </p>
        <ResetDemoButton />
      </section>
    </div>
  );
}
