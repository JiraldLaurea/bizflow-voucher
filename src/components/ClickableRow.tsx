"use client";

import { useRouter } from "next/navigation";

export default function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr className="clickable-row" onClick={() => router.push(href)}>
      {children}
    </tr>
  );
}
