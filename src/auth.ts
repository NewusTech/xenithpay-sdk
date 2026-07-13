import { createHmac, randomBytes } from 'crypto';

/**
 * Generates the HMAC SHA256 signature for a Xenith API request.
 *
 * Signature payload format:
 *   METHOD\n{uri}\n{timestamp}\n{minifiedBody}
 *
 * @param method   HTTP method (GET, POST, etc.) — uppercase
 * @param uri      Path + query string, e.g. "/v1/payins?foo=bar"
 * @param timestamp ISO 8601 / RFC 3339 timestamp string
 * @param body     Raw request body string (empty string if no body)
 * @param secretKey Xenith secret key from environment/config
 * @returns Base64-encoded HMAC SHA256 signature
 */
export function generateSignature(
  method: string,
  uri: string,
  timestamp: string,
  body: string,
  secretKey: string
): string {
  const payload = `${method}\n${uri}\n${timestamp}\n${body}`;
  return createHmac('sha256', secretKey).update(payload).digest('base64');
}

/**
 * Generates a random alphanumeric idempotency key (100 characters).
 */
export function generateIdempotencyKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 100;
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => characters[b % characters.length])
    .join('');
}
