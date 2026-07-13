// ---------------------------------------------------------------------------
// Webhook Types
// ---------------------------------------------------------------------------

// --- Common ---

export interface WebhookPayload<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  schemaVersion: string;
  timestamp: string;
  /** Present on maintenance webhooks */
  eventType?: string;
  data: T;
}

// --- Pay In Webhook ---

export type PayInWebhookData = {
  id: string;
  initiatedAmount: string;
  paymentAmount: string;
  feeAmount: string;
  currency: string;
  paymentMethod: string;
  paymentChannel: string;
  paymentCode: string;
  paymentCodeType: string;
  referenceCode: string;
  customerReference: string;
  customerName: string;
  status: string;
  createdTime: string;
  updatedTime: string;
  expirationTime: string;
  description: string;
  payerAccountName: string;
  payerAccountNumber: string;
  payerPaymentChannel: string;
  metadata: Record<string, unknown>;
  errorCode: string;
  errorMessage: string;
};

export interface PayInWebhookPayload extends WebhookPayload<PayInWebhookData> {}

// --- Pay In Maintenance Webhook ---

export type PayInMaintenanceWebhookData = {
  currency: string;
  paymentMethod: string;
  paymentChannels: string[];
  status: string;
};

export interface PayInMaintenanceWebhookPayload extends WebhookPayload<PayInMaintenanceWebhookData> {
  eventType: string;
}

// --- Pay Out Webhook ---

export type PayOutWebhookData = {
  id: string;
  initiatedAmount: string;
  sentAmount: string;
  feeAmount: string;
  currency: string;
  destinationPayoutChannel: string;
  destinationPayoutMethod: string;
  referenceCode: string;
  customerReference: string;
  status: string;
  createdTime: string;
  updatedTime: string;
  description: string;
  errorCode: string;
  errorMessage: string;
};

export interface PayOutWebhookPayload extends WebhookPayload<PayOutWebhookData> {}

// --- Pay Out Maintenance Webhook ---

export type PayOutMaintenanceWebhookData = {
  currency: string;
  destinationPayoutMethod: string;
  destinationPayoutChannels: string[];
  status: string;
};

export interface PayOutMaintenanceWebhookPayload extends WebhookPayload<PayOutMaintenanceWebhookData> {
  eventType: string;
}

// --- Verify Result ---

export interface VerifyWebhookResult {
  /** Whether the computed signature matches the header signature */
  valid: boolean;
  /** The parsed webhook payload (only present when valid is true) */
  payload?: WebhookPayload;
  /** Error message explaining why verification failed */
  reason?: string;
}
