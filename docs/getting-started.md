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
