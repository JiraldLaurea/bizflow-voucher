import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

// Semaphore (Philippine SMS aggregator) — https://semaphore.co/docs
// Sender name must be pre-registered with the provider (see Risk §20.2).
export const semaphoreProvider: SmsProvider = {
  name: "semaphore",
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    if (!apiKey) return { ok: false, error: "SEMAPHORE_API_KEY not configured" };

    try {
      const res = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          apikey: apiKey,
          number: input.to,
          message: input.body,
          ...(process.env.SEMAPHORE_SENDER_NAME
            ? { sendername: process.env.SEMAPHORE_SENDER_NAME }
            : {}),
        }),
      });
      const data = (await res.json()) as Array<{ message_id?: number }> | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        return { ok: false, error: `Semaphore error: ${JSON.stringify(data)}` };
      }
      return { ok: true, providerMessageId: String(data[0]?.message_id ?? "") };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Semaphore request failed" };
    }
  },
};
