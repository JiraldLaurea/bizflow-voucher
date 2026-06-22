import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import SideNav from "@/components/SideNav";
import type { UserRole } from "@prisma/client";

import type { IconName } from "@/components/SideNav";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR", "BRANCH_MANAGER"] },
  { href: "/campaigns", label: "Campaigns", icon: "campaigns", roles: ["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"] },
  { href: "/businesses", label: "Businesses", icon: "businesses", roles: ["PLATFORM_ADMIN"] },
  { href: "/users", label: "Users", icon: "users", roles: ["PLATFORM_ADMIN", "BUSINESS_OWNER"] },
  { href: "/validate", label: "Validate Voucher", icon: "validate", roles: ["PLATFORM_ADMIN", "BUSINESS_OWNER", "BRANCH_MANAGER", "STORE_STAFF"] },
  { href: "/settings", label: "Settings", icon: "settings", roles: ["PLATFORM_ADMIN"] },
];

const ROLE_LABEL: Record<UserRole, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  BUSINESS_OWNER: "Business Owner",
  BRANCH_MANAGER: "Branch Manager",
  STORE_STAFF: "Store Staff",
  CAMPAIGN_OPERATOR: "Campaign Operator",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const items = NAV.filter((i) => i.roles.includes(user.role)).map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">BizFlow</Link>
        <SideNav items={items} />
        <div className="nav-footer">
          <div style={{ padding: "8px 12px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{user.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{ROLE_LABEL[user.role]}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
