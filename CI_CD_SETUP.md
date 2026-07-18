# CI/CD Pipeline Setup

Dokumentasi pipeline CI/CD yang telah dikonfigurasi untuk xenithpay-sdk.

## Workflows yang Tersedia

### 1. **CI Workflow** (`.github/workflows/ci.yml`)
Berjalan otomatis pada setiap push ke branch `main` atau `develop`, dan pada setiap pull request.

**Yang dilakukan:**
- Test di Node.js 18.x, 20.x, dan 22.x
- Lint code dengan ESLint
- Jalankan test suite dengan Jest
- Build TypeScript
- Upload coverage report ke Codecov

**Trigger:** Push ke main/develop, PR ke main/develop

---

### 2. **Publish Workflow** (`.github/workflows/publish.yml`)
Publish package ke npm secara otomatis ketika tag versi di-push.

**Yang dilakukan:**
- Jalankan linter
- Jalankan tests
- Build project
- Publish ke npm registry

**Trigger:** Push git tag dengan format `v*` (contoh: `v1.0.0`)

**Setup yang diperlukan:**
```bash
# Set NPM_TOKEN di GitHub Secrets
# Settings > Secrets and variables > Actions > New repository secret
# Nama: NPM_TOKEN
# Value: (npm token dengan publish permission)
```

**Cara menggunakan:**
```bash
# 1. Update version di package.json
npm version patch  # atau minor/major

# 2. Tag akan otomatis dibuat dan dipush
# atau manual:
git tag v0.0.2
git push origin v0.0.2

# 3. GitHub Actions akan publish ke npm secara otomatis
```

---

### 3. **Release Workflow** (`.github/workflows/release.yml`)
Membuat GitHub Release secara otomatis saat tag di-push.

**Yang dilakukan:**
- Generate changelog dari git commits
- Buat GitHub Release dengan changelog
- Setiap release link ke npm package

**Trigger:** Push git tag dengan format `v*`

---

### 4. **CodeQL Workflow** (`.github/workflows/codeql.yml`)
Security scanning untuk mendeteksi potential vulnerabilities.

**Yang dilakukan:**
- Analyze code dengan CodeQL
- Report findings

**Trigger:**
- Push ke main
- PR ke main  
- Weekly schedule (Senin pukul 00:00 UTC)

---

### 5. **Dependabot** (`.github/dependabot.yml`)
Automated dependency updates.

**Yang dilakukan:**
- Check npm dependencies setiap minggu
- Check GitHub Actions setiap minggu
- Buat PR otomatis untuk updates
- Max 10 npm PRs dan 5 GA PRs terbuka

---

## GitHub Secrets yang Diperlukan

### NPM_TOKEN (Wajib untuk Publishing)
```bash
# Login ke npm
npm login

# Generate token di https://www.npmjs.com/settings/masqomar21/tokens
# Buat token dengan 'Automation' type untuk CI/CD
# Scope: 'write' untuk publish permission

# Add ke GitHub Secrets:
# 1. Go to: https://github.com/NewusTech/xenithpay-sdk/settings/secrets/actions
# 2. Click "New repository secret"
# 3. Name: NPM_TOKEN
# 4. Value: (paste token dari npm)
```

### CODECOV_TOKEN (Optional)
```bash
# Untuk upload code coverage ke codecov.io
# https://codecov.io/gh/NewusTech/xenithpay-sdk/settings
```

---

## Deployment Flow

### Development Flow:
```
Feature branch → Push → CI tests run → PR → Review → Merge to main → CI tests run again
```

### Release Flow:
```
Update version → Tag (v1.0.0) → Push tag → 
  ├─ Publish to npm
  ├─ Create GitHub Release  
  └─ CI tests run
```

---

## Useful Commands

### Manual version bump:
```bash
# Patch (0.0.x)
npm version patch

# Minor (0.x.0)
npm version minor

# Major (x.0.0)
npm version major
```

### Create tag manually:
```bash
git tag v0.0.2
git push origin v0.0.2
```

### View recent tags:
```bash
git tag -l --sort=-version:refname | head -10
```

---

## Troubleshooting

### Publish fails dengan OTP error:
```bash
# Need 2FA code dari authenticator
npm publish --otp=123456
```

### Publish workflow tidak triggered:
- Pastikan tag format: `v*` (contoh: `v1.0.0`, `v0.0.1`)
- Cek: Settings > Actions > General > Workflow permissions: "Read and write permissions"

### Tests fail di CI tapi pass locally:
- Bisa jadi Node version issue, check matrix di ci.yml
- Cek environment variables atau secrets

---

## Next Steps

1. ✅ Setup CI/CD workflows
2. ⏳ Add NPM_TOKEN ke GitHub Secrets
3. ⏳ Publish versi pertama dengan: `npm version patch && git push origin v0.0.2`
4. ⏳ Monitor first automated release
5. ⏳ Add branch protection rules (optional):
   - Require CI to pass
   - Require PR reviews
