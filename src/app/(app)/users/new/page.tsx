import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessRecordScope } from "@/lib/rbac";
import NewUserForm from "@/components/NewUserForm";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "PLATFORM_ADMIN" && user.role !== "BUSINESS_OWNER") redirect("/dashboard");

  const businesses = await prisma.business.findMany({
    where: businessRecordScope(user),
    orderBy: { name: "asc" },
    include: { branches: { where: { isActive: true }, orderBy: { name: "asc" } } },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/users" className="hover:text-gray-800">Users</Link>
        <span>/</span>
        <span className="text-gray-800">New</span>
      </div>
      <h1 className="mb-5 text-xl font-semibold">New User</h1>
      <NewUserForm
        isAdmin={user.role === "PLATFORM_ADMIN"}
        ownBusinessId={user.businessId}
        businesses={businesses.map((b) => ({
          id: b.id,
          name: b.name,
          branches: b.branches.map((br) => ({ id: br.id, name: br.name })),
        }))}
      />
    </div>
  );
}
