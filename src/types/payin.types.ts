// ---------------------------------------------------------------------------
// Pay In Types
// ---------------------------------------------------------------------------

// --- Channels ---

export interface GetPayInChannelsParams {
  currency: string;
}

export interface PayInChannel {
  method: string;
  channel: string;
  currency: string;
  [key: string]: unknown;
}

export type GetPayInChannelsResponse = PayInChannel[];

// --- Create Pay In ---

export interface CreatePayInRequest {
  initiatedAmount: number;
  currency: string;
  paymentMethod: string;
  paymentChannel: string;
  referenceCode: string;
  customerReference?: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
}

export interface CreatePayInResponse {
  id: string;
  status: string;
  initiatedAmount: number;
  currency: string;
  paymentMethod: string;
  paymentChannel: string;
  referenceCode: string;
  customerReference?: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  checkoutUrl?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// --- Get Pay In Detail ---

export type GetPayInDetailResponse = CreatePayInResponse;

// --- Simulate Pay In ---

export interface SimulatePayInRequest {
  transactionId: string;
  transactionCategory: 'payins' | string;
  transactionStatus: 'SUCCESS' | 'FAILED' | string;
}

export interface SimulatePayInResponse {
  success: boolean;
  [key: string]: unknown;
}
