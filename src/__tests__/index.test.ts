import { XenithClient, XenithApiError } from '../index';
import type { XenithClientConfig } from '../index';

describe('XenithClient — instantiation', () => {
  const config: XenithClientConfig = {
    accessKey: 'ak-test',
    secretKey: 'sk-test',
    baseUrl: 'https://api.test.xenithpay.com',
  };

  it('creates an instance with balances, payins, and payouts resources', () => {
    const client = new XenithClient(config);
    expect(client.balances).toBeDefined();
    expect(client.payins).toBeDefined();
    expect(client.payouts).toBeDefined();
  });

  it('exports XenithApiError', () => {
    expect(XenithApiError).toBeDefined();
    const err = new XenithApiError('test error', 400, { code: 'BAD_REQUEST' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(XenithApiError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('test error');
    expect(err.name).toBe('XenithApiError');
  });
});
