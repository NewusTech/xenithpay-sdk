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
