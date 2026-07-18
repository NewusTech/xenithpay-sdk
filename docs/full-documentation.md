# xenithpay-sdk — Dokumentasi Lengkap

TypeScript SDK untuk Xenith Payment API.

> **Requirement**: Node.js ≥ 18 (menggunakan native `fetch` dan `crypto` — tanpa dependency tambahan)

---

## Daftar Isi

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Balances](#balances)
4. [Pay Ins](#pay-ins)
5. [Webhook Validation](#webhook-validation)

## Ringkasan API

| Resource | Method | Endpoint |
|---|---|---|
| `client.balances` | `getBalances()` | `GET /v1/balances` |
| `client.payins` | `getChannels()` | `GET /v1/payins/channels` |
| `client.payins` | `getById()` | `GET /v1/payins/:id` |
| `client.payins` | `create()` | `POST /v1/payins` |
| `client.payins` | `simulate()` | `POST /v1/simulator/transaction` |
| `client.payouts` | `getChannels()` | `GET /v1/payouts/channels` |
| `client.payouts` | `syncAccountInquiry()` | `POST /v1/account-inquiry/sync` |
| `client.payouts` | `asyncAccountInquiry()` | `POST /v1/account-inquiry/async` |
| `client.payouts` | `create()` | `POST /v1/payouts` |
| `client.payouts` | `getById()` | `GET /v1/payouts/:id` |
| `client.payouts` | `list()` | `GET /v1/payouts` |

# Getting Started

## Instalasi

```bash
npm install xenithpay-sdk
```

> **Requirement**: Node.js ≥ 18 (menggunakan native `fetch` dan `crypto` — tanpa dependency tambahan)

---

## Konfigurasi

Buat instance `XenithClient` dengan tiga parameter wajib:

```ts
import { XenithClient } from 'xenithpay-sdk';

const client = new XenithClient({
  accessKey: process.env.XENITH_ACCESS_KEY!,
  secretKey: process.env.XENITH_SECRET_KEY!,
  baseUrl: 'https://api.staging.xenithpay.com',
});
```

### `XenithClientConfig`

| Field | Type | Keterangan |
|---|---|---|
| `accessKey` | `string` | Xenith Access Key (public), didapat dari Developer Settings |
| `secretKey` | `string` | Xenith Secret Key, digunakan untuk signing setiap request |
| `baseUrl` | `string` | Base URL API. Staging: `https://api.staging.xenithpay.com` |

> **Tip**: Simpan `accessKey` dan `secretKey` di environment variable, jangan di-hardcode di kode.

---

## Cara Mendapatkan API Keys

1. Buat akun di [Xenith](https://app.staging.xenithpay.com)
2. Login ke akun Xenith
3. Buka halaman **Developer Settings**
4. Generate API Keys — simpan `secret_key` dan `access_key` secara aman

---

## Error Handling

Semua HTTP error (response non-2xx) akan di-throw sebagai `XenithApiError`.

```ts
import { XenithClient, XenithApiError } from 'xenithpay-sdk';

const client = new XenithClient({ ... });

try {
  const payin = await client.payins.getById('pi-invalid-id');
} catch (err) {
  if (err instanceof XenithApiError) {
    console.error('Status:', err.statusCode); // e.g. 404
    console.error('Message:', err.message);   // pesan dari API
    console.error('Data:', err.data);         // full response body
  }
}
```

### `XenithApiError`

| Property | Type | Keterangan |
|---|---|---|
| `statusCode` | `number` | HTTP status code, e.g. `400`, `401`, `404`, `500` |
| `message` | `string` | Pesan error dari response API |
| `data` | `unknown` | Raw response body (bisa `object` atau `string`) |

### Kode Error Umum

| Status | Kemungkinan Penyebab |
|---|---|
| `400` | Request body tidak valid atau field wajib tidak diisi |
| `401` | Signature atau access key salah / expired |
| `404` | Resource dengan ID tersebut tidak ditemukan |
| `409` | Idempotency key conflict — request duplikat |
| `422` | Data tidak dapat diproses (e.g. nomor rekening tidak valid) |
| `500` | Internal server error dari Xenith |

---

## TypeScript Support

SDK ditulis sepenuhnya dalam TypeScript. Semua request body dan response sudah memiliki tipe yang terdefinisi:

```ts
import type {
  CreatePayInRequest,
  CreatePayInResponse,
  CreatePayOutRequest,
  GetBalancesResponse,
} from 'xenithpay-sdk';
```

Lihat [`src/types/`](../src/types/) untuk daftar lengkap semua interface yang tersedia.

---

# Authentication

SDK menangani autentikasi secara **otomatis** di setiap request. Tidak ada setup tambahan yang diperlukan dari sisi pengguna selain menyediakan `accessKey` dan `secretKey` saat instantiasi.

---

## Cara Kerja Signature

Setiap request ke Xenith API membutuhkan 3 header autentikasi:

| Header | Keterangan |
|---|---|
| `Xenith-Api-Key` | Access key (public) dari config |
| `Xenith-Request-Timestamp` | Timestamp ISO 8601 saat request dibuat |
| `Xenith-Request-Signature` | HMAC SHA256 dari signature payload, di-encode Base64 |

### Format Signature Payload

```
{METHOD}\n{path+query}\n{timestamp}\n{minifiedBody}
```

**Contoh** untuk `POST /v1/payins`:

```
POST
/v1/payins
2026-01-30T07:00:00.000Z
{"initiatedAmount":10000,"currency":"VND","paymentMethod":"QR_CODE","paymentChannel":"VIETQR","referenceCode":"ref-001"}
```

Payload di atas kemudian di-hash dengan HMAC SHA256 menggunakan `secretKey` dan di-encode Base64:

```ts
import { createHmac } from 'crypto';

const signature = createHmac('sha256', secretKey)
  .update(payload)
  .digest('base64');
```

> SDK menggunakan Node.js built-in `crypto` — tidak ada dependency pihak ketiga.

---

## Idempotency Key

Beberapa endpoint mendukung parameter `idempotencyKey` opsional. Idempotency key digunakan untuk mencegah duplikasi transaksi jika terjadi network retry.

### Perilaku Default

Jika `idempotencyKey` **tidak diisi**, SDK akan **auto-generate** key berupa random string **100 karakter alphanumeric** yang aman secara kriptografis.

```ts
// Idempotency key di-generate otomatis
const payin = await client.payins.create({ ... });

// Atau sediakan key sendiri untuk kontrol penuh
const payin = await client.payins.create({ ... }, 'order-payment-001-attempt-1');
```

### Kapan Harus Custom Key?

Gunakan custom idempotency key ketika Anda ingin memastikan bahwa request yang sama (e.g., setelah timeout atau network error) tidak menyebabkan transaksi ganda:

```ts
const idempotencyKey = `payin-${orderId}-${userId}`;

try {
  const payin = await client.payins.create(payload, idempotencyKey);
} catch (err) {
  if (err instanceof XenithApiError && err.statusCode === 409) {
    // Request dengan key ini sudah pernah diproses — fetch data yang sudah ada
    const existing = await client.payins.getById(existingId);
  }
}
```

### Endpoint yang Mendukung Idempotency Key

| Endpoint | Header yang Dikirim |
|---|---|
| `client.payins.getById(id, key?)` | `X-Idempotency-Key` |
| `client.payins.create(body, key?)` | `X-Idempotency-Key` |
| `client.payins.simulate(body, key?)` | `X-Idempotency-Key` |
| `client.payouts.create(body, key?)` | `X-Idempotency-key` |

---

# Balances

Resource untuk mengambil informasi saldo akun merchant.

**Akses via**: `client.balances`

---

## Methods

### `getBalances()`

Mengambil semua saldo akun merchant untuk semua currency yang aktif.

#### Signature

```ts
getBalances(): Promise<GetBalancesResponse>
```

#### Contoh

```ts
const balances = await client.balances.getBalances();

for (const balance of balances) {
  console.log(`${balance.currency}: ${balance.amount}`);
}
// IDR: 5000000
// VND: 200000
```

#### Returns

`Promise<GetBalancesResponse>` — array dari objek `Balance`.

```ts
type GetBalancesResponse = Balance[];

interface Balance {
  currency: string; // Kode mata uang ISO 4217, e.g. "IDR", "VND"
  amount: number;   // Saldo saat ini
  [key: string]: unknown;
}
```

#### Contoh Response

```json
[
  {
    "currency": "IDR",
    "amount": 5000000
  },
  {
    "currency": "VND",
    "amount": 200000
  }
]
```

#### Error yang Mungkin Terjadi

| Status | Penyebab |
|---|---|
| `401` | Access key atau signature tidak valid |
| `500` | Internal server error |

---

## Lihat Juga

- [Contoh kode lengkap](./examples/balances.ts)
- [Getting Started](./getting-started.md)
- [Authentication](./authentication.md)

---

# Pay Ins

Resource untuk menerima pembayaran dari customer (Pay In).

**Akses via**: `client.payins`

---

## Methods

- [`getChannels(params)`](#getchannelsparams)
- [`getById(id, idempotencyKey?)`](#getbyidid-idempotencykey)
- [`create(body, idempotencyKey?)`](#createbody-idempotencykey)
- [`simulate(body, idempotencyKey?)`](#simulatebody-idempotencykey)

---

### `getChannels(params)`

Mengambil daftar channel Pay In yang tersedia untuk currency tertentu.

#### Signature

```ts
getChannels(params: GetPayInChannelsParams): Promise<GetPayInChannelsResponse>
```

#### Parameters

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `params.currency` | `string` | ✅ | Kode mata uang ISO 4217, e.g. `"VND"`, `"IDR"` |

#### Contoh

```ts
const channels = await client.payins.getChannels({ currency: 'VND' });

console.log(channels);
// [
//   { method: 'QR_CODE', channel: 'VIETQR', currency: 'VND' },
//   { method: 'VIRTUAL_ACCOUNT', channel: 'VIETINBANK', currency: 'VND' },
// ]
```

#### Returns

```ts
type GetPayInChannelsResponse = PayInChannel[];

interface PayInChannel {
  method: string;  // e.g. "QR_CODE", "VIRTUAL_ACCOUNT"
  channel: string; // e.g. "VIETQR", "VIETINBANK"
  currency: string;
  [key: string]: unknown;
}
```

---

### `getById(id, idempotencyKey?)`

Mengambil detail transaksi Pay In berdasarkan ID.

#### Signature

```ts
getById(id: string, idempotencyKey?: string): Promise<GetPayInDetailResponse>
```

#### Parameters

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `id` | `string` | ✅ | Pay In transaction ID |
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi |

#### Contoh

```ts
const payin = await client.payins.getById('pi-01JRSP41F6P7ZR13RSABGBJ92R');

console.log(payin.status);          // "SUCCESS"
console.log(payin.initiatedAmount); // 10000
console.log(payin.currency);        // "VND"
```

#### Returns

```ts
// GetPayInDetailResponse = CreatePayInResponse
interface CreatePayInResponse {
  id: string;
  status: string;           // "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED"
  initiatedAmount: number;
  currency: string;
  paymentMethod: string;    // e.g. "QR_CODE"
  paymentChannel: string;   // e.g. "VIETQR"
  referenceCode: string;
  customerReference?: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  checkoutUrl?: string;     // URL halaman pembayaran untuk redirect customer
  qrCode?: string;          // QR code string (tersedia jika paymentMethod = "QR_CODE")
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  [key: string]: unknown;
}
```

---

### `create(body, idempotencyKey?)`

Membuat request Pay In baru. Setelah berhasil, gunakan `checkoutUrl` atau `qrCode` untuk mengarahkan customer ke halaman pembayaran.

#### Signature

```ts
create(body: CreatePayInRequest, idempotencyKey?: string): Promise<CreatePayInResponse>
```

#### Parameters — `body`

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `initiatedAmount` | `number` | ✅ | Nominal transaksi (dalam satuan terkecil mata uang) |
| `currency` | `string` | ✅ | Kode mata uang, e.g. `"VND"`, `"IDR"` |
| `paymentMethod` | `string` | ✅ | Metode pembayaran, e.g. `"QR_CODE"` |
| `paymentChannel` | `string` | ✅ | Channel pembayaran, e.g. `"VIETQR"` |
| `referenceCode` | `string` | ✅ | Reference ID unik dari merchant (untuk rekonsiliasi) |
| `customerReference` | `string` | ❌ | Reference ID dari sisi customer |
| `customerName` | `string` | ❌ | Nama customer |
| `description` | `string` | ❌ | Deskripsi transaksi |
| `callbackUrl` | `string` | ❌ | URL webhook untuk menerima notifikasi status pembayaran |
| `redirectUrl` | `string` | ❌ | URL redirect setelah customer menyelesaikan pembayaran |

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi |

#### Contoh

```ts
const payin = await client.payins.create({
  initiatedAmount: 10000,
  currency: 'VND',
  paymentMethod: 'QR_CODE',
  paymentChannel: 'VIETQR',
  referenceCode: `order-${orderId}`,
  customerName: 'Budi Santoso',
  description: `Pembayaran Order #${orderId}`,
  callbackUrl: 'https://yourapp.com/webhook/payin',
  redirectUrl: `https://yourapp.com/orders/${orderId}/success`,
});

console.log(payin.id);          // "pi-01JXXXXX"
console.log(payin.status);      // "PENDING"
console.log(payin.qrCode);      // "00020101021226..."  ← tampilkan ke customer
console.log(payin.checkoutUrl); // "https://checkout.xenithpay.com/..."
```

#### Returns

`Promise<CreatePayInResponse>` — lihat interface di [`getById`](#getbyidid-idempotencykey).

#### Error yang Mungkin Terjadi

| Status | Penyebab |
|---|---|
| `400` | Field wajib tidak diisi, atau format tidak valid |
| `401` | Signature atau access key tidak valid |
| `409` | `referenceCode` sudah pernah digunakan |
| `422` | Currency atau channel tidak didukung |

---

### `simulate(body, idempotencyKey?)`

Mensimulasikan perubahan status transaksi Pay In. **Hanya tersedia di environment sandbox/staging.**

#### Signature

```ts
simulate(body: SimulatePayInRequest, idempotencyKey?: string): Promise<SimulatePayInResponse>
```

#### Parameters — `body`

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `transactionId` | `string` | ✅ | ID transaksi Pay In yang akan disimulasikan |
| `transactionCategory` | `string` | ✅ | Selalu `"payins"` |
| `transactionStatus` | `string` | ✅ | Status tujuan: `"SUCCESS"` atau `"FAILED"` |

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi |

#### Contoh

```ts
// 1. Buat Pay In request
const payin = await client.payins.create({ ... });
console.log(payin.status); // "PENDING"

// 2. Simulasikan pembayaran berhasil (sandbox only)
await client.payins.simulate({
  transactionId: payin.id,
  transactionCategory: 'payins',
  transactionStatus: 'SUCCESS',
});

// 3. Cek status terbaru
const updated = await client.payins.getById(payin.id);
console.log(updated.status); // "SUCCESS"
```

#### Returns

```ts
interface SimulatePayInResponse {
  success: boolean;
  [key: string]: unknown;
}
```

---

## Lihat Juga

- [Contoh kode lengkap](./examples/payins.ts)
- [Authentication & Idempotency Key](./authentication.md)
- [Pay Outs](./payouts.md)

---

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
