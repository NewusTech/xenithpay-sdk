import { createHmac } from 'crypto';
import type { VerifyWebhookResult, WebhookPayload } from './types';

/**
 * Default maximum age (in seconds) for a webhook timestamp before it is
 * considered a replay attack. Xenith recommends a 5-minute window.
 */
const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Validates incoming Xenith webhook requests by verifying the HMAC-SHA256
 * signature included in the `X-Xenith-Signature` request header.
 *
 * @example
 * ```ts
 * import { WebhookValidator } from 'xenithpay-sdk';
 *
 * const validator = new WebhookValidator(process.env.XENITH_WEBHOOK_SECRET!);
 *
 * // Inside your Express / Fastify / Next.js route handler:
 * const result = validator.verify({
 *   method: 'POST',
 *   urlPath: '/v1/webhook',
 *   rawBody: req.rawBody,          // raw (un-parsed) request body string
 *   timestamp: req.headers['x-xenith-timestamp'],
 *   signature: req.headers['x-xenith-signature'],
 * });
 *
 * if (!result.valid) {
 *   return res.status(401).json({ error: result.reason });
 * }
 *
 * const payload = result.payload; // typed as WebhookPayload
 * ```
 */
export class WebhookValidator {
  constructor(private readonly webhookSecret: string) {}

  /**
   * Verifies a Xenith webhook request.
   *
   * Signature payload format (per Xenith docs):
   *   `{HTTP_METHOD}\n{URL_PATH}\n{REQUEST_BODY}\n{TIMESTAMP_RFC3339}`
   *
   * @param options.method    HTTP method from the incoming request (e.g. "POST")
   * @param options.urlPath   Full URL path of the webhook endpoint (e.g. "/v1/webhook")
   * @param options.rawBody   Raw (un-parsed) request body string — do NOT re-serialize JSON
   * @param options.timestamp Value of the `X-Xenith-Timestamp` header (RFC 3339)
   * @param options.signature Value of the `X-Xenith-Signature` header
   * @param options.toleranceSeconds Maximum age of the timestamp in seconds (default: 300)
   */
  verify(options: {
    method: string;
    urlPath: string;
    rawBody: string;
    timestamp: string | undefined;
    signature: string | undefined;
    toleranceSeconds?: number;
  }): VerifyWebhookResult {
    const { method, urlPath, rawBody, timestamp, signature, toleranceSeconds } = options;
    const tolerance = toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;

    // --- 1. Validate headers are present ---
    if (!timestamp) {
      return { valid: false, reason: 'Missing X-Xenith-Timestamp header' };
    }
    if (!signature) {
      return { valid: false, reason: 'Missing X-Xenith-Signature header' };
    }

    // --- 2. Check timestamp is within tolerance to prevent replay attacks ---
    const webhookTime = new Date(timestamp).getTime();
    if (isNaN(webhookTime)) {
      return { valid: false, reason: 'Invalid X-Xenith-Timestamp format (expected RFC 3339)' };
    }

    const ageSeconds = (Date.now() - webhookTime) / 1000;
    if (ageSeconds > tolerance) {
      return {
        valid: false,
        reason: `Webhook timestamp is too old (${Math.round(ageSeconds)}s > ${tolerance}s tolerance)`,
      };
    }

    // --- 3. Compute expected signature ---
    // Format: METHOD\nURL_PATH\nREQUEST_BODY\nTIMESTAMP
    const payload = `${method.toUpperCase()}\n${urlPath}\n${rawBody}\n${timestamp}`;
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('base64');

    // --- 4. Compare signatures using timing-safe comparison ---
    if (!timingSafeEqual(expectedSignature, signature)) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    // --- 5. Parse and return the payload ---
    let parsed: WebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return { valid: false, reason: 'Failed to parse webhook body as JSON' };
    }

    return { valid: true, payload: parsed };
  }
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Avoids using Buffer.from() to stay compatible with edge runtimes
 * by falling back to a character-by-character comparison that always
 * iterates the full length of the expected string.
 */
function timingSafeEqual(expected: string, actual: string): boolean {
  // Always iterate over the full expected length so the loop duration
  // does not reveal how many characters matched.
  let mismatch = expected.length !== actual.length ? 1 : 0;
  for (let i = 0; i < expected.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    mismatch |= expected.charCodeAt(i) ^ (actual.charCodeAt(i) ?? 0);
  }
  return mismatch === 0;
}
