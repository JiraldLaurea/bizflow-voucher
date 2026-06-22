"use client";

import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <code style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "var(--ink)", flex: 1, wordBreak: "break-all" }}>
        {url}
      </code>
      <button onClick={copy} className="btn-secondary" style={{ flexShrink: 0, height: 36, padding: "0 12px", fontSize: 13 }}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
