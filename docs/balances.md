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
