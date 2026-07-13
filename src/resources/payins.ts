import { generateIdempotencyKey } from '../auth';
import { HttpClient } from '../http';
import type {
  CreatePayInRequest,
  CreatePayInResponse,
  GetPayInChannelsParams,
  GetPayInChannelsResponse,
  GetPayInDetailResponse,
  SimulatePayInRequest,
  SimulatePayInResponse,
} from '../types';

export class PayInsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get available Pay In channels for a given currency.
   *
   * @example client.payins.getChannels({ currency: 'VND' })
   */
  async getChannels(params: GetPayInChannelsParams): Promise<GetPayInChannelsResponse> {
    const query = new URLSearchParams({ currency: params.currency }).toString();
    return this.http.request<GetPayInChannelsResponse>('GET', `/v1/payins/channels?${query}`);
  }

  /**
   * Get Pay In transaction detail by ID.
   *
   * @param id             Pay In transaction ID
   * @param idempotencyKey Optional idempotency key (auto-generated if omitted)
   */
  async getById(id: string, idempotencyKey?: string): Promise<GetPayInDetailResponse> {
    const key = idempotencyKey ?? generateIdempotencyKey();
    return this.http.request<GetPayInDetailResponse>('GET', `/v1/payins/${id}`, undefined, {
      'X-Idempotency-Key': key,
    });
  }

  /**
   * Create a new Pay In request.
   *
   * @param body           Pay In request payload
   * @param idempotencyKey Optional idempotency key (auto-generated if omitted)
   */
  async create(body: CreatePayInRequest, idempotencyKey?: string): Promise<CreatePayInResponse> {
    const key = idempotencyKey ?? generateIdempotencyKey();
    return this.http.request<CreatePayInResponse>(
      'POST',
      '/v1/payins',
      body,
      { 'X-Idempotency-Key': key }
    );
  }

  /**
   * Simulate a Pay In transaction (sandbox / staging only).
   *
   * @param body           Simulation payload
   * @param idempotencyKey Optional idempotency key (auto-generated if omitted)
   */
  async simulate(
    body: SimulatePayInRequest,
    idempotencyKey?: string
  ): Promise<SimulatePayInResponse> {
    const key = idempotencyKey ?? generateIdempotencyKey();
    return this.http.request<SimulatePayInResponse>(
      'POST',
      '/v1/simulator/transaction',
      body,
      { 'X-Idempotency-Key': key }
    );
  }
}
