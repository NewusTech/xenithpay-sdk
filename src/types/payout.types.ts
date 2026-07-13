// ---------------------------------------------------------------------------
// Pay Out Types
// ---------------------------------------------------------------------------

// --- Channels ---

export interface GetPayOutChannelsParams {
  currency: string;
}

export interface PayOutChannel {
  method: string;
  channel: string;
  currency: string;
  [key: string]: unknown;
}

export type GetPayOutChannelsResponse = PayOutChannel[];

// --- Account Inquiry ---

export interface SyncAccountInquiryRequest {
  currency: string;
  destinationPayoutMethod: string;
  destinationPayoutChannel: string;
  destinationPayoutAccount: string;
}

export interface AsyncAccountInquiryRequest extends SyncAccountInquiryRequest {
  callbackUrl: string;
}

export interface AccountInquiryResponse {
  accountName?: string;
  accountNumber?: string;
  status: string;
  [key: string]: unknown;
}

// --- Create Pay Out ---

export interface CreatePayOutRequest {
  initiatedAmount: number;
  currency: string;
  destinationPayoutMethod: string;
  destinationPayoutChannel: string;
  destinationPayoutAccount: string;
  destinationPayoutAccountName: string;
  referenceCode: string;
  customerReference?: string;
  description?: string;
  callbackUrl?: string;
}

export interface CreatePayOutResponse {
  id: string;
  status: string;
  initiatedAmount: number;
  currency: string;
  destinationPayoutMethod: string;
  destinationPayoutChannel: string;
  destinationPayoutAccount: string;
  destinationPayoutAccountName: string;
  referenceCode: string;
  customerReference?: string;
  description?: string;
  callbackUrl?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// --- Get Pay Out Detail ---

export type GetPayOutDetailResponse = CreatePayOutResponse;

// --- Get Pay Outs List ---

export interface GetPayOutsListParams {
  page?: number;
  limit?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

export interface GetPayOutsListResponse {
  data: CreatePayOutResponse[];
  total?: number;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}
