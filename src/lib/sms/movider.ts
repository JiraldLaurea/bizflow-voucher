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

      const res = await fetch("https://api.movider.net/v1/sms", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = (await res.json()) as {
        response_code?: number;
        response?: string;
        messages?: Array<{ "message-id"?: string; status?: number }>;
      };

      if (!res.ok || data.response_code !== 0) {
        return { ok: false, error: `Movider error: ${data.response ?? JSON.stringify(data)}` };
      }

      const msgId = data.messages?.[0]?.["message-id"];
      return { ok: true, providerMessageId: msgId ? String(msgId) : undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Movider request failed" };
    }
  },
};
