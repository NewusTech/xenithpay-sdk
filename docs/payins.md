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
| `initiatedAmount` | `number` | ✅ | Nominal transaksi dalam mata uang terkait |
| `currency` | `string` | ✅ | Kode mata uang ISO 4217, e.g. `"VND"`, `"IDR"` |
| `paymentMethod` | `string` | ✅ | Metode pembayaran, e.g. `"QR_CODE"` |
| `paymentChannel` | `string` | ✅ | Channel pembayaran, e.g. `"VIETQR"` |
| `referenceCode` | `string` | ✅ | Reference ID unik dari merchant (untuk rekonsiliasi) |
| `customerReference` | `string` | ✅ | Reference ID dari sisi customer |
| `customerName` | `string` | ✅ | Nama customer (minimum 5 karakter) |
| `callbackUrl` | `string` | ✅ | URL webhook untuk menerima notifikasi status pembayaran |
| `redirectUrl` | `string` | ✅ | URL redirect setelah customer menyelesaikan pembayaran |
| `customerPhoneNumber` | `string` | ❌ | Nomor telepon customer (Wajib untuk channel OVO & PKR) |
| `description` | `string` | ❌ | Deskripsi transaksi |
| `metadata` | `object` | ❌ | Metadata spesifik channel (CNY, KRW, LAK, THB) |

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
