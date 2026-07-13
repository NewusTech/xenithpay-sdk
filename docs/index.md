# xenithpay-sdk — Dokumentasi

TypeScript SDK untuk Xenith Payment API.

## Daftar Isi

- [Getting Started](./getting-started.md) — Instalasi, konfigurasi, dan error handling
- [Authentication](./authentication.md) — Cara kerja HMAC signature & idempotency key
- [Balances](./balances.md) — Mengambil saldo akun merchant
- [Pay Ins](./payins.md) — Menerima pembayaran (Pay In)
- [Pay Outs](./payouts.md) — Mengirim dana (Pay Out)

## Contoh Kode

Lihat folder [`examples/`](./examples/) untuk contoh penggunaan lengkap setiap resource yang bisa langsung dijalankan.

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
