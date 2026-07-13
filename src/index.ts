import { HttpClient } from './http';
import { BalancesResource } from './resources/balances';
import { PayInsResource } from './resources/payins';
import { PayOutsResource } from './resources/payouts';

export { WebhookValidator } from './webhook';

export { XenithApiError } from './errors';
export * from './types';

export interface XenithClientConfig {
  /** Xenith access key (public key) */
  accessKey: string;
  /** Xenith secret key — used to sign requests */
  secretKey: string;
  /** Base URL, e.g. "https://api.xenithpay.com" */
  baseUrl: string;
}

/**
 * Main entry point for the xenithpay-sdk.
 *
 * @example
 * ```ts
 * import { XenithClient, WebhookValidator } from 'xenithpay-sdk';
 *
 * const client = new XenithClient({
 *   accessKey: process.env.XENITH_ACCESS_KEY!,
 *   secretKey: process.env.XENITH_SECRET_KEY!,
 *   baseUrl: 'https://api.staging.xenithpay.com',
 * });
 *
 * const balances = await client.balances.getBalances();
 * const payin = await client.payins.create({ ... });
 * const payout = await client.payouts.create({ ... });
 *
 * // Webhook validation
 * const validator = new WebhookValidator(process.env.XENITH_WEBHOOK_SECRET!);
 * const result = validator.verify({ method, urlPath, rawBody, timestamp, signature });
 * ```
 */
export class XenithClient {
  public readonly balances: BalancesResource;
  public readonly payins: PayInsResource;
  public readonly payouts: PayOutsResource;

  constructor(config: XenithClientConfig) {
    const http = new HttpClient(config);
    this.balances = new BalancesResource(http);
    this.payins = new PayInsResource(http);
    this.payouts = new PayOutsResource(http);
  }
}
