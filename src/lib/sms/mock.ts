import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

// Default dev provider: logs the message and "succeeds" so the full funnel
// works end-to-end without external credentials.
export const mockProvider: SmsProvider = {
  name: "mock",
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    console.log(`[SMS:mock] -> ${input.to}\n${input.body}\n`);
    return { ok: true, providerMessageId: `mock_${Date.now()}` };
  },
};
