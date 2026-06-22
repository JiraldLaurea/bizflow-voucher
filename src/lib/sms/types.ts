export interface SendSmsInput {
  to: string; // E.164
  body: string;
}

export interface SendSmsResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsProvider {
  name: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
