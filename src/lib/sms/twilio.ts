import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

// Twilio fallback provider (REST API, no SDK dependency).
export const twilioProvider: SmsProvider = {
  name: "twilio",
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      return { ok: false, error: "Twilio credentials not configured" };
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          },
          body: new URLSearchParams({ To: input.to, From: from, Body: input.body }),
        }
      );
      const data = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) return { ok: false, error: data.message ?? "Twilio request failed" };
      return { ok: true, providerMessageId: data.sid };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Twilio request failed" };
    }
  },
};
