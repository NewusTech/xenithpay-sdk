import { HttpClient } from '../http';
import type { GetBalancesResponse } from '../types';

export class BalancesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get all balances for the merchant account.
   */
  async getBalances(): Promise<GetBalancesResponse> {
    return this.http.request<GetBalancesResponse>('GET', '/v1/balances');
  }
}
