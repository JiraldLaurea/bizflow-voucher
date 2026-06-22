import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 48, fontWeight: 700, color: "var(--line)", marginBottom: 8 }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Page not found</div>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        This record may have been deleted or you may have followed a stale link.
      </p>
      <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
    </div>
  );
}
