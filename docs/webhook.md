# Webhook Validation

Xenith signs every webhook it sends with an HMAC-SHA256 signature and includes it in the
`X-Xenith-Signature` request header. The `WebhookValidator` class verifies this signature and
guards against replay attacks by checking the timestamp freshness.

---

## Installation

`WebhookValidator` is exported directly from the SDK — no additional dependency is needed.

```ts
import { WebhookValidator } from 'xenithpay-sdk';
```

---

## Quick Start

```ts
const validator = new WebhookValidator(process.env.XENITH_WEBHOOK_SECRET!);

const result = validator.verify({
  method:    'POST',
  urlPath:   '/v1/webhook',
  rawBody:   rawBodyString,             // ⚠️ Must be the unmodified raw string
  timestamp: req.headers['x-xenith-timestamp'],
  signature: req.headers['x-xenith-signature'],
});

if (!result.valid) {
  console.error('Invalid webhook:', result.reason);
  return res.status(401).end();
}

// result.payload is the parsed WebhookPayload
console.log(result.payload);
```

---

## How the Signature is Built

Xenith concatenates the following fields with `\n` separators, then signs the result with
HMAC-SHA256 (base64-encoded):

```
POST\n
/v1/webhook\n
{...rawRequestBody...}\n
2024-11-29T10:05:01.530805501Z
```

| Part | Source |
|---|---|
| HTTP method | Always `POST`, uppercase |
| URL path | Full path of your webhook endpoint |
| Raw body | Exact bytes received — **do not parse/re-serialise** |
| Timestamp | Value of the `X-Xenith-Timestamp` request header |

> **Critical:** JSON field order is not guaranteed across retries. Always pass the **raw body string**
> to `verify()`. Parsing to an object and calling `JSON.stringify()` again may reorder fields and
> break the signature check.

---

## API Reference

### `new WebhookValidator(webhookSecret: string)`

| Parameter | Type | Description |
|---|---|---|
| `webhookSecret` | `string` | The **Webhook Signature Secret** from your Xenith dashboard |

### `validator.verify(options)`

| Option | Type | Required | Description |
|---|---|---|---|
| `method` | `string` | ✅ | HTTP method (`"POST"` — case-insensitive) |
| `urlPath` | `string` | ✅ | Full URL path of your webhook endpoint (e.g. `"/v1/webhook"`) |
| `rawBody` | `string` | ✅ | Raw (un-parsed) request body string |
| `timestamp` | `string \| undefined` | ✅ | Value of the `X-Xenith-Timestamp` header (RFC 3339) |
| `signature` | `string \| undefined` | ✅ | Value of the `X-Xenith-Signature` header |
| `toleranceSeconds` | `number` | ❌ | Max age of the timestamp in seconds (default: **300**) |

Returns a `VerifyWebhookResult`:

```ts
interface VerifyWebhookResult {
  valid: boolean;
  payload?: WebhookPayload;  // Present only when valid is true
  reason?: string;           // Present only when valid is false
}
```

---

## Webhook Payload Types

### Pay In (`PayInWebhookPayload`)

```ts
import type { PayInWebhookPayload } from 'xenithpay-sdk';
```

```json
{
  "schemaVersion": "1.0.1",
  "timestamp": "2024-11-29T10:05:01.530805501Z",
  "data": {
    "id": "pymt-01JDVNTTEZWNMVJYXSZEZR86G6",
    "initiatedAmount": "10000",
    "paymentAmount": "10000",
    "feeAmount": "2775",
    "currency": "IDR",
    "paymentMethod": "VIRTUAL_ACCOUNT",
    "paymentChannel": "BRI.VA",
    "status": "SUCCESS",
    ...
  }
}
```

### Pay Out (`PayOutWebhookPayload`)

```ts
import type { PayOutWebhookPayload } from 'xenithpay-sdk';
```

```json
{
  "schemaVersion": "1.0.1",
  "timestamp": "2024-11-30T06:54:08.556274303Z",
  "data": {
    "id": "pyout-01JDX620YP41KR6TSV68DK87DQ",
    "initiatedAmount": "10000",
    "sentAmount": "10000",
    "currency": "IDR",
    "status": "SUCCESS",
    ...
  }
}
```

### Maintenance — Pay Ins (`PayInMaintenanceWebhookPayload`)

```json
{
  "schemaVersion": "1.0.1",
  "timestamp": "2025-10-07T08:30:25.758598987Z",
  "eventType": "maintenance.started.payins",
  "data": {
    "currency": "IDR",
    "paymentMethod": "VIRTUAL_ACCOUNT",
    "paymentChannels": ["MDR.VA"],
    "status": "INACTIVE"
  }
}
```

### Maintenance — Pay Outs (`PayOutMaintenanceWebhookPayload`)

```json
{
  "schemaVersion": "1.0.1",
  "timestamp": "2025-10-07T08:30:25.758598987Z",
  "eventType": "maintenance.started.payouts",
  "data": {
    "currency": "IDR",
    "destinationPayoutMethod": "BANK_TRANSFER",
    "destinationPayoutChannels": ["CENAIDJA", "BNIAIDJA"],
    "status": "INACTIVE"
  }
}
```

---

## Framework Integration Examples

### Express

```ts
import express from 'express';
import { WebhookValidator } from 'xenithpay-sdk';

const app = express();
const validator = new WebhookValidator(process.env.XENITH_WEBHOOK_SECRET!);

// ⚠️ Use express.raw() — NOT express.json() — to get the raw body string
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const result = validator.verify({
      method:    req.method,
      urlPath:   req.path,
      rawBody:   req.body.toString('utf-8'),
      timestamp: req.headers['x-xenith-timestamp'] as string,
      signature: req.headers['x-xenith-signature'] as string,
    });

    if (!result.valid) {
      return res.status(401).json({ error: result.reason });
    }

    console.log('Webhook received:', result.payload);
    res.status(200).json({ received: true });
  }
);
```

### Next.js App Router (Route Handler)

```ts
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebhookValidator } from 'xenithpay-sdk';

const validator = new WebhookValidator(process.env.XENITH_WEBHOOK_SECRET!);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const result = validator.verify({
    method:    'POST',
    urlPath:   new URL(req.url).pathname,
    rawBody,
    timestamp: req.headers.get('x-xenith-timestamp') ?? undefined,
    signature: req.headers.get('x-xenith-signature') ?? undefined,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  console.log('Webhook received:', result.payload);
  return NextResponse.json({ received: true });
}
```

### Fastify

```ts
import Fastify from 'fastify';
import { WebhookValidator } from 'xenithpay-sdk';

const fastify = Fastify();
const validator = new WebhookValidator(process.env.XENITH_WEBHOOK_SECRET!);

// Add a content-type parser that keeps the raw body
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (_req, body, done) => done(null, body)
);

fastify.post('/webhook', (req, reply) => {
  const result = validator.verify({
    method:    req.method,
    urlPath:   req.routeOptions.url!,
    rawBody:   req.body as string,
    timestamp: req.headers['x-xenith-timestamp'],
    signature: req.headers['x-xenith-signature'],
  });

  if (!result.valid) {
    return reply.status(401).send({ error: result.reason });
  }

  console.log('Webhook received:', result.payload);
  reply.send({ received: true });
});
```

---

## Security Notes

| Requirement | How the SDK handles it |
|---|---|
| Signature verification | HMAC-SHA256, base64-encoded |
| Timing-safe comparison | Custom constant-time string comparison (no early exit) |
| Replay attack prevention | Timestamp checked against `toleranceSeconds` (default 300 s) |
| Raw body integrity | Callers must pass the raw body — docs warn against re-serialising |
| TLS | Enforced by your web server (TLS 1.2+ required by Xenith) |
