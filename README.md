# xenithpay-sdk

TypeScript SDK untuk Xenith Payment API. Mendukung **Balances**, **Pay Ins**, dan **Pay Outs**.

---

## Instalasi

```bash
npm install xenithpay-sdk
```

> **Requirement**: Node.js ≥ 18 (menggunakan native `fetch` dan `crypto`)

---

## Quick Start

```ts
import { XenithClient } from 'xenithpay-sdk';

const client = new XenithClient({
  accessKey: process.env.XENITH_ACCESS_KEY!,
  secretKey: process.env.XENITH_SECRET_KEY!,
  baseUrl: 'https://api.staging.xenithpay.com',
});
```

### Konfigurasi

```ts
interface XenithClientConfig {
  accessKey: string; // Xenith Access Key (public)
  secretKey: string; // Xenith Secret Key — digunakan untuk signing request
  baseUrl: string;   // Base URL API, e.g. "https://api.xenithpay.com"
}
```

> Signature HMAC SHA256 di-generate **otomatis** di setiap request. Tidak perlu setup manual.

---

## Error Handling

Semua error HTTP (non-2xx) akan di-throw sebagai `XenithApiError`:

```ts
import { XenithClient, XenithApiError } from 'xenithpay-sdk';

try {
  const payin = await client.payins.getById('invalid-id');
} catch (err) {
  if (err instanceof XenithApiError) {
    console.error(err.statusCode); // e.g. 404
    console.error(err.message);    // pesan dari API
    console.error(err.data);       // raw response body
  }
}
```

```ts
class XenithApiError extends Error {
  statusCode: number; // HTTP status code
  data: unknown;      // Raw response body dari API
  message: string;    // Pesan error
}
```

---

## Resources

### `client.balances`

#### `getBalances()`

Mengambil semua saldo akun merchant.

```ts
const balances = await client.balances.getBalances();
```

**Returns**: `Promise<GetBalancesResponse>`

```ts
// GetBalancesResponse = Balance[]
interface Balance {
  currency: string; // e.g. "IDR", "VND"
  amount: number;
  [key: string]: unknown;
}
```

**Contoh response:**
```json
[
  { "currency": "IDR", "amount": 5000000 },
  { "currency": "VND", "amount": 200000 }
]
```

---

### `client.payins`

#### `getChannels(params)`

Mengambil daftar channel Pay In yang tersedia untuk currency tertentu.

```ts
const channels = await client.payins.getChannels({ currency: 'VND' });
```

**Parameters:**

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `currency` | `string` | ✅ | Kode mata uang, e.g. `"VND"`, `"IDR"` |

**Returns**: `Promise<GetPayInChannelsResponse>`

```ts
// GetPayInChannelsResponse = PayInChannel[]
interface PayInChannel {
  method: string;  // e.g. "QR_CODE"
  channel: string; // e.g. "VIETQR"
  currency: string;
  [key: string]: unknown;
}
```

---

#### `getById(id, idempotencyKey?)`

Mengambil detail transaksi Pay In berdasarkan ID.

```ts
const payin = await client.payins.getById('pi-01JXXXXX');
// atau dengan custom idempotency key:
const payin = await client.payins.getById('pi-01JXXXXX', 'my-custom-key');
```

**Parameters:**

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `id` | `string` | ✅ | Pay In transaction ID |
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi (100 char alphanumeric) |

**Returns**: `Promise<GetPayInDetailResponse>`

```ts
// GetPayInDetailResponse = CreatePayInResponse
interface CreatePayInResponse {
  id: string;
  status: string;           // e.g. "PENDING", "SUCCESS", "FAILED"
  initiatedAmount: number;
  currency: string;
  paymentMethod: string;
  paymentChannel: string;
  referenceCode: string;
  customerReference?: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  checkoutUrl?: string;     // URL redirect ke halaman pembayaran
  qrCode?: string;          // QR code string (untuk method QR_CODE)
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  [key: string]: unknown;
}
```

---

#### `create(body, idempotencyKey?)`

Membuat request Pay In baru.

```ts
const payin = await client.payins.create({
  initiatedAmount: 10000,
  currency: 'VND',
  paymentMethod: 'QR_CODE',
  paymentChannel: 'VIETQR',
  referenceCode: 'ref-20260130-001',
  customerReference: 'cust-ref-001',
  customerName: 'Budi Santoso',
  description: 'Pembayaran order #001',
  callbackUrl: 'https://yourapp.com/webhook/payin',
  redirectUrl: 'https://yourapp.com/success',
});
```

**Parameters — `body`:**

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `initiatedAmount` | `number` | ✅ | Nominal transaksi dalam mata uang terkait |
| `currency` | `string` | ✅ | Kode mata uang ISO 4217, e.g. `"VND"` |
| `paymentMethod` | `string` | ✅ | e.g. `"QR_CODE"` |
| `paymentChannel` | `string` | ✅ | e.g. `"VIETQR"` |
| `referenceCode` | `string` | ✅ | Reference unik dari merchant |
| `customerReference` | `string` | ✅ | Reference ID customer dari merchant |
| `customerName` | `string` | ✅ | Nama customer (min. 5 karakter) |
| `callbackUrl` | `string` | ✅ | URL webhook notifikasi transaksi |
| `redirectUrl` | `string` | ✅ | URL redirect setelah transaksi selesai |
| `customerPhoneNumber` | `string` | ❌ | Nomor HP customer (Wajib untuk OVO/PKR) |
| `description` | `string` | ❌ | Deskripsi transaksi |
| `metadata` | `object` | ❌ | Metadata tambahan spesifik payment channel |

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi |

**Returns**: `Promise<CreatePayInResponse>`

---

#### `simulate(body, idempotencyKey?)`

Mensimulasikan status transaksi Pay In. **Hanya untuk environment sandbox/staging.**

```ts
await client.payins.simulate({
  transactionId: 'pi-01JXXXXX',
  transactionCategory: 'payins',
  transactionStatus: 'SUCCESS',
});
```

**Parameters — `body`:**

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `transactionId` | `string` | ✅ | ID transaksi Pay In yang akan disimulasikan |
| `transactionCategory` | `string` | ✅ | `"payins"` |
| `transactionStatus` | `string` | ✅ | `"SUCCESS"` \| `"FAILED"` |

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi |

**Returns**: `Promise<SimulatePayInResponse>`

```ts
interface SimulatePayInResponse {
  success: boolean;
  [key: string]: unknown;
}
```

---

### `client.payouts`

#### `getChannels(params)`

Mengambil daftar channel Pay Out yang tersedia untuk currency tertentu.

```ts
const channels = await client.payouts.getChannels({ currency: 'IDR' });
```

**Parameters:**

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `currency` | `string` | ✅ | Kode mata uang, e.g. `"IDR"`, `"VND"` |

**Returns**: `Promise<GetPayOutChannelsResponse>`

```ts
// GetPayOutChannelsResponse = PayOutChannel[]
interface PayOutChannel {
  method: string;  // e.g. "BANK_TRANSFER"
  channel: string; // e.g. "BFTVVNVX"
  currency: string;
  [key: string]: unknown;
}
```

---

#### `syncAccountInquiry(body)`

Validasi nomor rekening secara **sinkron** — hasil langsung dikembalikan dalam response.

```ts
const account = await client.payouts.syncAccountInquiry({
  currency: 'VND',
  destinationPayoutMethod: 'BANK_TRANSFER',
  destinationPayoutChannel: 'BIDVVNVX',
  destinationPayoutAccount: '99991010100011',
});

console.log(account.accountName); // "Nguyen Van A"
```

**Parameters — `body`:**

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `currency` | `string` | ✅ | Kode mata uang |
| `destinationPayoutMethod` | `string` | ✅ | e.g. `"BANK_TRANSFER"` |
| `destinationPayoutChannel` | `string` | ✅ | Kode bank, e.g. `"BIDVVNVX"` |
| `destinationPayoutAccount` | `string` | ✅ | Nomor rekening tujuan |

**Returns**: `Promise<AccountInquiryResponse>`

```ts
interface AccountInquiryResponse {
  accountName?: string;   // Nama pemilik rekening
  accountNumber?: string; // Nomor rekening
  status: string;         // e.g. "SUCCESS", "FAILED"
  [key: string]: unknown;
}
```

---

#### `asyncAccountInquiry(body)`

Validasi nomor rekening secara **asinkron** — hasil dikirim via `callbackUrl`.

```ts
await client.payouts.asyncAccountInquiry({
  currency: 'VND',
  destinationPayoutMethod: 'BANK_TRANSFER',
  destinationPayoutChannel: 'BFTVVNVX',
  destinationPayoutAccount: '4647280398',
  callbackUrl: 'https://yourapp.com/webhook/account-inquiry',
});
```

**Parameters — `body`:**

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `currency` | `string` | ✅ | Kode mata uang |
| `destinationPayoutMethod` | `string` | ✅ | e.g. `"BANK_TRANSFER"` |
| `destinationPayoutChannel` | `string` | ✅ | Kode bank |
| `destinationPayoutAccount` | `string` | ✅ | Nomor rekening tujuan |
| `callbackUrl` | `string` | ✅ | URL untuk menerima hasil inquiry |

**Returns**: `Promise<AccountInquiryResponse>`

---

#### `create(body, idempotencyKey?)`

Membuat request Pay Out baru (transfer dana ke rekening tujuan).

```ts
const payout = await client.payouts.create({
  initiatedAmount: 10000,
  currency: 'VND',
  destinationPayoutMethod: 'BANK_TRANSFER',
  destinationPayoutChannel: 'BFTVVNVX',
  destinationPayoutAccount: '555518986412',
  destinationPayoutAccountName: 'Nguyen Hoang Nam',
  referenceCode: 'ref-payout-20260130-001',
  customerReference: 'cust-payout-001',
  description: 'Pencairan dana order #001',
  callbackUrl: 'https://yourapp.com/webhook/payout',
});
```

**Parameters — `body`:**

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `initiatedAmount` | `number` | ✅ | Nominal yang akan ditransfer |
| `currency` | `string` | ✅ | Kode mata uang |
| `destinationPayoutMethod` | `string` | ✅ | e.g. `"BANK_TRANSFER"` |
| `destinationPayoutChannel` | `string` | ✅ | Kode bank tujuan |
| `destinationPayoutAccount` | `string` | ✅ | Nomor rekening tujuan |
| `destinationPayoutAccountName` | `string` | ✅ | Nama pemilik rekening tujuan |
| `referenceCode` | `string` | ✅ | Reference unik dari merchant |
| `customerReference` | `string` | ❌ | Reference dari customer |
| `description` | `string` | ❌ | Deskripsi transaksi |
| `callbackUrl` | `string` | ❌ | URL webhook notifikasi |

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `idempotencyKey` | `string` | ❌ | Auto-generated jika tidak diisi |

**Returns**: `Promise<CreatePayOutResponse>`

```ts
interface CreatePayOutResponse {
  id: string;
  status: string;                       // e.g. "PENDING", "SUCCESS", "FAILED"
  initiatedAmount: number;
  currency: string;
  destinationPayoutMethod: string;
  destinationPayoutChannel: string;
  destinationPayoutAccount: string;
  destinationPayoutAccountName: string;
  referenceCode: string;
  customerReference?: string;
  description?: string;
  callbackUrl?: string;
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
  [key: string]: unknown;
}
```

---

#### `getById(id)`

Mengambil detail transaksi Pay Out berdasarkan ID.

```ts
const payout = await client.payouts.getById('po-01JXXXXX');
```

**Parameters:**

| Parameter | Type | Required | Keterangan |
|---|---|---|---|
| `id` | `string` | ✅ | Pay Out transaction ID |

**Returns**: `Promise<GetPayOutDetailResponse>`

> `GetPayOutDetailResponse` adalah alias dari `CreatePayOutResponse`.

---

#### `list(params?)`

Mengambil daftar transaksi Pay Out dengan opsi filter dan pagination.

```ts
// Semua transaksi
const result = await client.payouts.list();

// Dengan filter
const result = await client.payouts.list({
  currency: 'IDR',
  status: 'SUCCESS',
  page: 1,
  limit: 20,
});

console.log(result.data);  // CreatePayOutResponse[]
console.log(result.total); // total records
```

**Parameters — `params` (opsional):**

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `page` | `number` | ❌ | Halaman ke- (default: 1) |
| `limit` | `number` | ❌ | Jumlah data per halaman |
| `currency` | `string` | ❌ | Filter by currency |
| `status` | `string` | ❌ | Filter by status |

**Returns**: `Promise<GetPayOutsListResponse>`

```ts
interface GetPayOutsListResponse {
  data: CreatePayOutResponse[];
  total?: number;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}
```

---

## Idempotency Key

Beberapa endpoint menerima parameter `idempotencyKey` opsional. Jika tidak diisi, SDK akan **auto-generate** key berupa random string 100 karakter alphanumeric.

```ts
// Auto-generated
await client.payins.create({ ... });

// Custom key
await client.payins.create({ ... }, 'my-unique-key-for-this-request');
```

Endpoint yang mendukung idempotency key:

| Endpoint | Header |
|---|---|
| `client.payins.getById()` | `X-Idempotency-Key` |
| `client.payins.create()` | `X-Idempotency-Key` |
| `client.payins.simulate()` | `X-Idempotency-Key` |
| `client.payouts.create()` | `X-Idempotency-key` |

---

## Authentication

SDK menangani autentikasi secara otomatis di setiap request menggunakan 3 header:

| Header | Keterangan |
|---|---|
| `Xenith-Api-Key` | Access key dari config |
| `Xenith-Request-Timestamp` | Timestamp ISO 8601 saat request dibuat |
| `Xenith-Request-Signature` | HMAC SHA256 dari signature payload, di-encode Base64 |

Format signature payload:
```
{METHOD}\n{path+query}\n{timestamp}\n{minifiedBody}
```

Tidak ada setup tambahan yang diperlukan dari sisi pengguna.

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode (rebuild on change)
npm run dev

# Lint
npm run lint
npm run lint:fix
```

---

## License

MIT
