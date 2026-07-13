import { generateIdempotencyKey } from '../auth';
import { HttpClient } from '../http';
import type {
  AccountInquiryResponse,
  AsyncAccountInquiryRequest,
  CreatePayOutRequest,
  CreatePayOutResponse,
  GetPayOutChannelsParams,
  GetPayOutChannelsResponse,
  GetPayOutDetailResponse,
  GetPayOutsListParams,
  GetPayOutsListResponse,
  SyncAccountInquiryRequest,
} from '../types';

export class PayOutsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get available Pay Out channels for a given currency.
   *
   * @example client.payouts.getChannels({ currency: 'IDR' })
   */
  async getChannels(params: GetPayOutChannelsParams): Promise<GetPayOutChannelsResponse> {
    const query = new URLSearchParams({ currency: params.currency }).toString();
    return this.http.request<GetPayOutChannelsResponse>('GET', `/v1/payouts/channels?${query}`);
  }

  /**
   * Synchronous account inquiry — returns result immediately.
   */
  async syncAccountInquiry(
    body: SyncAccountInquiryRequest
  ): Promise<AccountInquiryResponse> {
    return this.http.request<AccountInquiryResponse>(
      'POST',
      '/v1/account-inquiry/sync',
      body
    );
  }

  /**
   * Asynchronous account inquiry — result delivered via callbackUrl.
   */
  async asyncAccountInquiry(
    body: AsyncAccountInquiryRequest
  ): Promise<AccountInquiryResponse> {
    return this.http.request<AccountInquiryResponse>(
      'POST',
      '/v1/account-inquiry/async',
      body
    );
  }

  /**
   * Create a new Pay Out request.
   *
   * @param body           Pay Out request payload
   * @param idempotencyKey Optional idempotency key (auto-generated if omitted)
   */
  async create(
    body: CreatePayOutRequest,
    idempotencyKey?: string
  ): Promise<CreatePayOutResponse> {
    const key = idempotencyKey ?? generateIdempotencyKey();
    return this.http.request<CreatePayOutResponse>(
      'POST',
      '/v1/payouts',
      body,
      { 'X-Idempotency-key': key }
    );
  }

  /**
   * Get Pay Out transaction detail by ID.
   */
  async getById(id: string): Promise<GetPayOutDetailResponse> {
    return this.http.request<GetPayOutDetailResponse>('GET', `/v1/payouts/${id}`);
  }

  /**
   * Get a paginated list of Pay Out transactions.
   */
  async list(params?: GetPayOutsListParams): Promise<GetPayOutsListResponse> {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    return this.http.request<GetPayOutsListResponse>('GET', `/v1/payouts${query}`);
  }
}
