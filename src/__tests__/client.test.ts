import { XenithApiError } from '../errors';
import { XenithClient } from '../index';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper: build a mock Response
function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Shared client config
// ---------------------------------------------------------------------------

const config = {
  accessKey: 'test-access-key',
  secretKey: 'test-secret-key',
  baseUrl: 'https://api.test.xenithpay.com',
};

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Auth headers verification
// ---------------------------------------------------------------------------

describe('XenithClient — auth headers', () => {
  it('attaches Xenith-Api-Key, Xenith-Request-Timestamp, and Xenith-Request-Signature on every request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));

    const client = new XenithClient(config);
    await client.balances.getBalances();

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers['Xenith-Api-Key']).toBe(config.accessKey);
    expect(headers['Xenith-Request-Timestamp']).toBeDefined();
    expect(headers['Xenith-Request-Signature']).toBeDefined();
    // Signature must be a non-empty base64 string
    expect(headers['Xenith-Request-Signature']).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('throws XenithApiError on non-2xx responses', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ message: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    );

    const client = new XenithClient(config);
    await expect(client.balances.getBalances()).rejects.toThrow(XenithApiError);

    try {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
      );
      await client.balances.getBalances();
    } catch (err) {
      expect(err).toBeInstanceOf(XenithApiError);
      expect((err as XenithApiError).statusCode).toBe(401);
    }
  });
});

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

describe('client.balances', () => {
  it('getBalances() — calls GET /v1/balances', async () => {
    const fakeData = [{ currency: 'IDR', amount: 100000 }];
    mockFetch.mockResolvedValueOnce(mockResponse(fakeData));

    const client = new XenithClient(config);
    const result = await client.balances.getBalances();

    expect(result).toEqual(fakeData);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/v1/balances');
  });
});

// ---------------------------------------------------------------------------
// Pay Ins
// ---------------------------------------------------------------------------

describe('client.payins', () => {
  it('getChannels() — calls GET /v1/payins/channels with currency param', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));

    const client = new XenithClient(config);
    await client.payins.getChannels({ currency: 'VND' });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/v1/payins/channels');
    expect(url).toContain('currency=VND');
  });

  it('getById() — calls GET /v1/payins/:id with X-Idempotency-Key header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'pi-123', status: 'PENDING' }));

    const client = new XenithClient(config);
    await client.payins.getById('pi-123', 'my-key');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/payins/pi-123');
    expect((init.headers as Record<string, string>)['X-Idempotency-Key']).toBe('my-key');
  });

  it('getById() — auto-generates idempotency key when not provided', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'pi-456', status: 'PENDING' }));

    const client = new XenithClient(config);
    await client.payins.getById('pi-456');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const key = (init.headers as Record<string, string>)['X-Idempotency-Key'];
    expect(key).toBeDefined();
    expect(key).toHaveLength(100);
  });

  it('create() — calls POST /v1/payins with body', async () => {
    const fakeResponse = { id: 'pi-789', status: 'PENDING', initiatedAmount: 10000 };
    mockFetch.mockResolvedValueOnce(mockResponse(fakeResponse));

    const client = new XenithClient(config);
    const result = await client.payins.create({
      initiatedAmount: 10000,
      currency: 'VND',
      paymentMethod: 'QR_CODE',
      paymentChannel: 'VIETQR',
      referenceCode: 'ref-001',
      customerReference: 'cust-ref-001',
      customerName: 'Customer Test',
      callbackUrl: 'https://example.com/callback',
      redirectUrl: 'https://example.com/redirect',
    });

    expect(result).toEqual(fakeResponse);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/payins');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ initiatedAmount: 10000 });
  });

  it('simulate() — calls POST /v1/simulator/transaction', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ success: true }));

    const client = new XenithClient(config);
    await client.payins.simulate({
      transactionId: 'pi-789',
      transactionCategory: 'payins',
      transactionStatus: 'SUCCESS',
    });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/v1/simulator/transaction');
  });
});

// ---------------------------------------------------------------------------
// Pay Outs
// ---------------------------------------------------------------------------

describe('client.payouts', () => {
  it('getChannels() — calls GET /v1/payouts/channels with currency param', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));

    const client = new XenithClient(config);
    await client.payouts.getChannels({ currency: 'IDR' });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/v1/payouts/channels');
    expect(url).toContain('currency=IDR');
  });

  it('syncAccountInquiry() — calls POST /v1/account-inquiry/sync', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ status: 'SUCCESS', accountName: 'John Doe' }));

    const client = new XenithClient(config);
    await client.payouts.syncAccountInquiry({
      currency: 'VND',
      destinationPayoutMethod: 'BANK_TRANSFER',
      destinationPayoutChannel: 'BIDVVNVX',
      destinationPayoutAccount: '99991010100011',
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/account-inquiry/sync');
    expect(init.method).toBe('POST');
  });

  it('asyncAccountInquiry() — calls POST /v1/account-inquiry/async', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ status: 'PENDING' }));

    const client = new XenithClient(config);
    await client.payouts.asyncAccountInquiry({
      currency: 'VND',
      destinationPayoutMethod: 'BANK_TRANSFER',
      destinationPayoutChannel: 'BFTVVNVX',
      destinationPayoutAccount: '4647280398',
      callbackUrl: 'https://webhook.site/test',
    });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/v1/account-inquiry/async');
  });

  it('create() — calls POST /v1/payouts with X-Idempotency-key header', async () => {
    const fakeResponse = { id: 'po-001', status: 'PENDING', initiatedAmount: 10000 };
    mockFetch.mockResolvedValueOnce(mockResponse(fakeResponse));

    const client = new XenithClient(config);
    const result = await client.payouts.create(
      {
        initiatedAmount: 10000,
        currency: 'VND',
        destinationPayoutMethod: 'BANK_TRANSFER',
        destinationPayoutChannel: 'BFTVVNVX',
        destinationPayoutAccount: '555518986412',
        destinationPayoutAccountName: 'Nguyen Hoang Nam',
        referenceCode: 'ref-payout-001',
      },
      'custom-idem-key'
    );

    expect(result).toEqual(fakeResponse);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/payouts');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Idempotency-key']).toBe('custom-idem-key');
  });

  it('getById() — calls GET /v1/payouts/:id', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'po-001', status: 'SUCCESS' }));

    const client = new XenithClient(config);
    await client.payouts.getById('po-001');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/v1/payouts/po-001');
  });

  it('list() — calls GET /v1/payouts without path param', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: [], total: 0 }));

    const client = new XenithClient(config);
    await client.payouts.list();

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/payouts');
    expect(url).not.toContain('/v1/payouts/');
    expect(init.method).toBe('GET');
  });

  it('list() — appends query params when provided', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: [], total: 0 }));

    const client = new XenithClient(config);
    await client.payouts.list({ currency: 'IDR', limit: 10 });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('currency=IDR');
    expect(url).toContain('limit=10');
  });
});
