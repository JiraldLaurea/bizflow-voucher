export default function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat" style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 100 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}
