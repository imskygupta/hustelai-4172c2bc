// Provider-agnostic notification interfaces. Add new providers (discord, slack,
// webhook, whatsapp) by implementing NotificationProvider and registering in dispatcher.ts.

export type ProviderId = "telegram" | "discord" | "slack" | "webhook" | "whatsapp" | "email";

export interface NotificationMessage {
  title?: string;
  body: string;
  category?: string;
  url?: string;
  payload?: Record<string, any>;
}

export interface DeliveryResult {
  ok: boolean;
  external_message_id?: string;
  error?: string;
  skipped?: boolean;
}

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: ProviderId;
  provider_chat_id: string | null;
  provider_username: string | null;
  status: string;
  config: Record<string, any>;
}

export interface NotificationProvider {
  id: ProviderId;
  send(integration: IntegrationRow, msg: NotificationMessage): Promise<DeliveryResult>;
  verify?(integration: IntegrationRow): Promise<DeliveryResult>;
}