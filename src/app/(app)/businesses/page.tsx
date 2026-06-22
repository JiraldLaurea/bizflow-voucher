import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "PLATFORM_ADMIN") redirect("/dashboard");

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { campaigns: true, branches: true } } },
  });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Businesses</h1>
          <p>{businesses.length} registered</p>
        </div>
        <Link href="/businesses/new" className="btn-primary">+ New Business</Link>
      </div>

      {businesses.length === 0 ? (
        <div className="panel">
          <p style={{ color: "var(--muted)", margin: 0 }}>No businesses yet. Create the first SME client.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Industry</th>
                  <th>Plan</th>
                  <th>Branches</th>
                  <th>Campaigns</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                    <td style={{ color: "var(--muted)" }}>{b.industry}</td>
                    <td style={{ color: "var(--muted)" }}>{b.subscriptionPlan}</td>
                    <td style={{ color: "var(--muted)" }}>{b._count.branches}</td>
                    <td style={{ color: "var(--muted)" }}>{b._count.campaigns}</td>
                    <td>
                      <span className={b.status === "ACTIVE" ? "badge ok" : "badge neutral"}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
