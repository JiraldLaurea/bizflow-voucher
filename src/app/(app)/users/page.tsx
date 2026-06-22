import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessScope } from "@/lib/rbac";
import UserToggle from "@/components/UserToggle";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "PLATFORM_ADMIN" && user.role !== "BUSINESS_OWNER") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: businessScope(user),
    orderBy: { createdAt: "desc" },
    include: { business: true, branch: true },
  });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Users</h1>
          <p>{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/users/new" className="btn-primary">+ New User</Link>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Business</th>
                <th>Branch</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: "var(--muted)" }}>{u.email}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{u.role}</td>
                  <td style={{ color: "var(--muted)" }}>{u.business?.name ?? "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{u.branch?.name ?? "—"}</td>
                  <td>
                    <span className={u.isActive ? "badge ok" : "badge neutral"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {u.id !== user.id && <UserToggle id={u.id} isActive={u.isActive} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
