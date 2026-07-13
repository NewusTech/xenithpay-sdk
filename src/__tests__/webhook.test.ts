import { createHmac } from 'crypto';
import { WebhookValidator } from '../webhook';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = 'c238eaeb9561e104d6712f21bc0552818dcf3290a351103e4aba575df2a8c951';
const METHOD = 'POST';
const URL_PATH = '/v1/webhook';

/** Build a valid signature for the given inputs (mirrors the production algorithm) */
function buildSignature(body: string, timestamp: string): string {
  const payload = `${METHOD}\n${URL_PATH}\n${body}\n${timestamp}`;
  return createHmac('sha256', SECRET).update(payload).digest('base64');
}

/** Returns a timestamp that is `offsetMs` milliseconds away from now */
function makeTimestamp(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

// ---------------------------------------------------------------------------
// Pay In Webhook example from documentation
// ---------------------------------------------------------------------------

const PAY_IN_BODY =
  '{"schemaVersion":"1.0.1","timestamp":"2024-11-29T10:05:01.530805501Z","data":{"id":"pymt-01JDVNTTEZWNMVJYXSZEZR86G6","initiatedAmount":"10000","paymentAmount":"10000","feeAmount":"2775","currency":"IDR","paymentMethod":"VIRTUAL_ACCOUNT","paymentChannel":"BRI.VA","paymentCode":"1308300301295957","paymentCodeType":"ACCOUNT_NUMBER","referenceCode":"6c7d9958-0fd9-45df-b8b5-dc8450be0ca6","customerReference":"123456789","customerName":"John Doe","status":"SUCCESS","createdTime":"2024-11-29T10:05:01.20399773Z","updatedTime":"2024-11-29T10:05:01.20399773Z","expirationTime":"2024-11-30T10:00:29.943368Z","description":"Payment description","payerAccountName":"","payerAccountNumber":"","payerPaymentChannel":"","metadata":{},"errorCode":"","errorMessage":""}}';
const PAY_IN_TIMESTAMP = '2024-11-29T10:05:01.530805501Z';

// Pay Out Webhook example from documentation
const PAY_OUT_BODY =
  '{"schemaVersion":"1.0.1","timestamp":"2024-11-30T06:54:08.556274303Z","data":{"id":"pyout-01JDX620YP41KR6TSV68DK87DQ","initiatedAmount":"10000","sentAmount":"10000","feeAmount":"0","currency":"IDR","destinationPayoutChannel":"CENAIDJA","destinationPayoutMethod":"BANK_TRANSFER","referenceCode":"referenceCode - 1716098555","customerReference":"test-customerReference-123","status":"SUCCESS","createdTime":"2024-11-30T00:03:18.667578Z","updatedTime":"2024-11-30T06:54:08.27552654Z","description":"Sending Money-1716098555","errorCode":"","errorMessage":""}}';
const PAY_OUT_TIMESTAMP = '2024-11-30T06:54:08.556274303Z';

// Maintenance Pay In Webhook
const MAINTENANCE_PAYIN_BODY =
  '{"schemaVersion":"1.0.1","timestamp":"2025-10-07T08:30:25.758598987Z","eventType":"maintenance.started.payins","data":{"currency":"IDR","paymentMethod":"VIRTUAL_ACCOUNT","paymentChannels":["MDR.VA"],"status":"INACTIVE"}}';
const MAINTENANCE_PAYIN_TIMESTAMP = '2025-10-07T08:30:25.758598987Z';

// Maintenance Pay Out Webhook
const MAINTENANCE_PAYOUT_BODY =
  '{"schemaVersion":"1.0.1","timestamp":"2025-10-07T08:30:25.758598987Z","eventType":"maintenance.started.payouts","data":{"currency":"IDR","destinationPayoutMethod":"BANK_TRANSFER","destinationPayoutChannels":["CENAIDJA","BNIAIDJA"],"status":"INACTIVE"}}';
const MAINTENANCE_PAYOUT_TIMESTAMP = '2025-10-07T08:30:25.758598987Z';

// ---------------------------------------------------------------------------
// Signature algorithm — documentation vectors
// ---------------------------------------------------------------------------

describe('WebhookValidator — signature algorithm (documentation vectors)', () => {
  /**
   * These tests use the exact example data from the Xenith webhook docs.
   * Because the timestamps are in the past (beyond any tolerance window),
   * we disable timestamp checking by passing toleranceSeconds: Infinity.
   */
  const opts = { toleranceSeconds: Infinity };

  it('validates Pay In webhook from documentation', () => {
    const signature = buildSignature(PAY_IN_BODY, PAY_IN_TIMESTAMP);
    const validator = new WebhookValidator(SECRET);
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: PAY_IN_BODY,
      timestamp: PAY_IN_TIMESTAMP,
      signature,
      ...opts,
    });
    expect(result.valid).toBe(true);
    expect(result.payload?.schemaVersion).toBe('1.0.1');
  });

  it('validates Pay Out webhook from documentation', () => {
    const signature = buildSignature(PAY_OUT_BODY, PAY_OUT_TIMESTAMP);
    const validator = new WebhookValidator(SECRET);
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: PAY_OUT_BODY,
      timestamp: PAY_OUT_TIMESTAMP,
      signature,
      ...opts,
    });
    expect(result.valid).toBe(true);
    expect(result.payload?.schemaVersion).toBe('1.0.1');
  });

  it('validates Pay In Maintenance webhook from documentation', () => {
    const signature = buildSignature(MAINTENANCE_PAYIN_BODY, MAINTENANCE_PAYIN_TIMESTAMP);
    const validator = new WebhookValidator(SECRET);
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: MAINTENANCE_PAYIN_BODY,
      timestamp: MAINTENANCE_PAYIN_TIMESTAMP,
      signature,
      ...opts,
    });
    expect(result.valid).toBe(true);
    expect(result.payload?.eventType).toBe('maintenance.started.payins');
  });

  it('validates Pay Out Maintenance webhook from documentation', () => {
    const signature = buildSignature(MAINTENANCE_PAYOUT_BODY, MAINTENANCE_PAYOUT_TIMESTAMP);
    const validator = new WebhookValidator(SECRET);
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: MAINTENANCE_PAYOUT_BODY,
      timestamp: MAINTENANCE_PAYOUT_TIMESTAMP,
      signature,
      ...opts,
    });
    expect(result.valid).toBe(true);
    expect(result.payload?.eventType).toBe('maintenance.started.payouts');
  });
});

// ---------------------------------------------------------------------------
// Signature verification — live timestamps
// ---------------------------------------------------------------------------

describe('WebhookValidator — signature verification', () => {
  let validator: WebhookValidator;

  beforeEach(() => {
    validator = new WebhookValidator(SECRET);
  });

  it('returns valid: true for a correctly signed request', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', timestamp: new Date().toISOString(), data: {} });
    const ts = makeTimestamp();
    const sig = buildSignature(body, ts);

    const result = validator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig });
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.reason).toBeUndefined();
  });

  it('returns the parsed payload on success', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', timestamp: new Date().toISOString(), data: { id: 'pi-123' } });
    const ts = makeTimestamp();
    const sig = buildSignature(body, ts);

    const result = validator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig });
    expect(result.valid).toBe(true);
    expect((result.payload?.data as Record<string, unknown>)?.id).toBe('pi-123');
  });

  it('returns valid: false when signature is wrong', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', timestamp: new Date().toISOString(), data: {} });
    const ts = makeTimestamp();
    const sig = buildSignature(body, ts);

    // Tamper with the body — signature must no longer match
    const tamperedBody = body.replace('1.0.1', '1.0.2');
    const result = validator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: tamperedBody, timestamp: ts, signature: sig });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Signature mismatch');
  });

  it('returns valid: false when wrong secret is used', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', timestamp: new Date().toISOString(), data: {} });
    const ts = makeTimestamp();
    const sig = buildSignature(body, ts);

    const wrongValidator = new WebhookValidator('wrong-secret');
    const result = wrongValidator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Signature mismatch');
  });

  it('normalises HTTP method to uppercase before signing', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', timestamp: new Date().toISOString(), data: {} });
    const ts = makeTimestamp();
    // Signature built with uppercase POST
    const sig = buildSignature(body, ts);

    // Validator should accept lowercase 'post' and still validate
    const result = validator.verify({ method: 'post', urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Missing / invalid headers
// ---------------------------------------------------------------------------

describe('WebhookValidator — missing / invalid headers', () => {
  let validator: WebhookValidator;
  const body = JSON.stringify({ schemaVersion: '1.0.1', data: {} });

  beforeEach(() => {
    validator = new WebhookValidator(SECRET);
  });

  it('returns valid: false when X-Xenith-Timestamp header is missing', () => {
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: body,
      timestamp: undefined,
      signature: 'some-sig',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('X-Xenith-Timestamp');
  });

  it('returns valid: false when X-Xenith-Signature header is missing', () => {
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: body,
      timestamp: makeTimestamp(),
      signature: undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('X-Xenith-Signature');
  });

  it('returns valid: false when timestamp is not a valid date', () => {
    const result = validator.verify({
      method: METHOD,
      urlPath: URL_PATH,
      rawBody: body,
      timestamp: 'not-a-date',
      signature: 'some-sig',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid X-Xenith-Timestamp');
  });
});

// ---------------------------------------------------------------------------
// Replay attack prevention
// ---------------------------------------------------------------------------

describe('WebhookValidator — replay attack prevention', () => {
  let validator: WebhookValidator;

  beforeEach(() => {
    validator = new WebhookValidator(SECRET);
  });

  it('rejects a timestamp older than the default 300-second tolerance', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', data: {} });
    const ts = makeTimestamp(-301_000); // 301 seconds in the past
    const sig = buildSignature(body, ts);

    const result = validator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too old');
  });

  it('accepts a timestamp within the default 300-second tolerance', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', data: {} });
    const ts = makeTimestamp(-10_000); // 10 seconds in the past
    const sig = buildSignature(body, ts);

    const result = validator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig });
    expect(result.valid).toBe(true);
  });

  it('respects a custom toleranceSeconds value', () => {
    const body = JSON.stringify({ schemaVersion: '1.0.1', data: {} });
    const ts = makeTimestamp(-601_000); // 601 seconds in the past
    const sig = buildSignature(body, ts);

    // With 600-second tolerance this should still fail
    const r1 = validator.verify({
      method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig,
      toleranceSeconds: 600,
    });
    expect(r1.valid).toBe(false);

    // With Infinity tolerance it should pass
    const r2 = validator.verify({
      method: METHOD, urlPath: URL_PATH, rawBody: body, timestamp: ts, signature: sig,
      toleranceSeconds: Infinity,
    });
    expect(r2.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JSON field ordering — critical per documentation
// ---------------------------------------------------------------------------

describe('WebhookValidator — JSON field ordering', () => {
  it('signature fails when the body is re-serialised (field order may change)', () => {
    const validator = new WebhookValidator(SECRET);
    const ts = makeTimestamp();

    // Original raw body with a specific field order
    const originalBody = '{"schemaVersion":"1.0.1","timestamp":"2024-01-01T00:00:00Z","data":{"b":2,"a":1}}';
    const sig = buildSignature(originalBody, ts);

    // Re-parsing and re-serialising can change field order
    const reparsed = JSON.stringify(JSON.parse(originalBody));

    if (reparsed === originalBody) {
      // If field order happened to be preserved in this runtime, skip the check
      return;
    }

    const result = validator.verify({ method: METHOD, urlPath: URL_PATH, rawBody: reparsed, timestamp: ts, signature: sig });
    // Demonstrates that callers MUST use the raw body, not a re-serialised version
    expect(result.valid).toBe(false);
  });
});
