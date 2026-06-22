"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

export default function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname.startsWith(item.href) ? "active" : ""}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
