import { generateIdempotencyKey, generateSignature } from '../auth';

describe('generateSignature', () => {
  const secretKey = 'test-secret-key';

  it('produces a base64 string', () => {
    const sig = generateSignature('GET', '/v1/balances', '2026-01-01T00:00:00.000Z', '', secretKey);
    // Base64 characters only
    expect(sig).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('is deterministic — same inputs produce same output', () => {
    const args: [string, string, string, string, string] = [
      'POST',
      '/v1/payins',
      '2026-01-01T00:00:00.000Z',
      '{"initiatedAmount":10000}',
      secretKey,
    ];
    expect(generateSignature(...args)).toBe(generateSignature(...args));
  });

  it('changes when method changes', () => {
    const base = generateSignature('GET', '/v1/payins', '2026-01-01T00:00:00.000Z', '', secretKey);
    const other = generateSignature('POST', '/v1/payins', '2026-01-01T00:00:00.000Z', '', secretKey);
    expect(base).not.toBe(other);
  });

  it('changes when body changes', () => {
    const ts = '2026-01-01T00:00:00.000Z';
    const s1 = generateSignature('POST', '/v1/payins', ts, '{"a":1}', secretKey);
    const s2 = generateSignature('POST', '/v1/payins', ts, '{"a":2}', secretKey);
    expect(s1).not.toBe(s2);
  });

  it('changes when timestamp changes', () => {
    const s1 = generateSignature('GET', '/v1/balances', '2026-01-01T00:00:00.000Z', '', secretKey);
    const s2 = generateSignature('GET', '/v1/balances', '2026-01-02T00:00:00.000Z', '', secretKey);
    expect(s1).not.toBe(s2);
  });

  it('changes when secret key changes', () => {
    const s1 = generateSignature('GET', '/v1/balances', '2026-01-01T00:00:00.000Z', '', 'key-a');
    const s2 = generateSignature('GET', '/v1/balances', '2026-01-01T00:00:00.000Z', '', 'key-b');
    expect(s1).not.toBe(s2);
  });
});

describe('generateIdempotencyKey', () => {
  it('returns a 100-character string', () => {
    expect(generateIdempotencyKey()).toHaveLength(100);
  });

  it('contains only alphanumeric characters', () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[A-Za-z0-9]{100}$/);
  });

  it('generates unique keys on consecutive calls', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateIdempotencyKey()));
    // Very unlikely to get duplicates in 20 calls
    expect(keys.size).toBe(20);
  });
});
