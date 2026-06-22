import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

export const moviderProvider: SmsProvider = {
  name: "movider",
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const apiKey = process.env.SMS_API_KEY;
    const apiSecret = process.env.SMS_API_SECRET;
    if (!apiKey || !apiSecret) return { ok: false, error: "SMS_API_KEY / SMS_API_SECRET not configured" };

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        api_secret: apiSecret,
        to: input.to,
        text: input.body,
      });
      if (process.env.SMS_SENDER_ID) {
        params.set("from", process.env.SMS_SENDER_ID);
      }

      const res = await fetch("https://api.movider.co/v1/sms", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        remaining_balance?: number;
        total_sms?: number;
        phone_number_list?: Array<{ number?: string; message_id?: string }>;
        bad_phone_number_list?: Array<{ number?: string; message?: string; error?: string }>;
      };

      // Reject on non-2xx, an error field, no accepted recipients, or a bad-number entry.
      const sent = data.phone_number_list ?? [];
      const bad = data.bad_phone_number_list ?? [];
      if (!res.ok || data.error || sent.length === 0 || bad.length > 0) {
        const reason =
          data.error ??
          (bad.length > 0
            ? bad.map((b) => `${b.number ?? ""}: ${b.message ?? b.error ?? "rejected"}`).join("; ")
            : null) ??
          (sent.length === 0 ? "No recipients accepted" : null) ??
          `HTTP ${res.status}`;
        return { ok: false, error: `Movider error: ${reason}` };
      }

      const msgId = sent[0]?.message_id;
      return { ok: true, providerMessageId: msgId ? String(msgId) : undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Movider request failed" };
    }
  },
};
