# BestApp Windows-da lokal işə salma

Bu təlimat BestApp layihəsini `Docker` olmadan, `Node.js + PostgreSQL` ilə Windows üzərində açmaq üçündür.

İşləyən ünvanlar:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:3000/docs`

Default giriş:

- Login: `admin@bestapp.local`
- Şifrə: `Admin123!`

## 1. Lazım olanlar

Quraşdırılmalıdır:

- Node.js LTS
- npm
- PostgreSQL

Yoxlama:

```powershell
node -v
npm -v
```

## 2. PostgreSQL hazırla

Tövsiyə olunan lokal bağlantı:

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `bestapp`

Əgər səndə başqa şifrə varsa, onu `.env` faylında yazacaqsan.

Database yarat:

```sql
CREATE DATABASE bestapp;
```

## 3. Layihə qovluğuna keç

```powershell
cd C:\Users\USER\Desktop\BestApp
```

## 4. Paketləri qur

```powershell
npm install
```

## 5. Lokal `.env` fayllarını hazırla

```powershell
npm run setup:local
```

Bu komanda bu faylları hazırlayır:

- `apps/backend/.env`
- `apps/frontend/.env`

### Backend `.env`

`apps/backend/.env` içində tipik lokal dəyər:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bestapp?schema=public
JWT_SECRET=super-secret-dev-key-change-me
JWT_EXPIRES_IN=1d
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Əgər PostgreSQL şifrən fərqlidirsə, yalnız `DATABASE_URL` hissəsini dəyiş:

```env
DATABASE_URL=postgresql://postgres:SENIN_SIFREN@localhost:5432/bestapp?schema=public
```

### Frontend `.env`

`apps/frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

## 6. Prisma client generate et

```powershell
npm run prisma:generate
```

## 7. Database migration işə sal

Əsas komanda:

```powershell
npm run db:migrate
```

Bu komanda indi **Windows lokal baza üçün təhlükəsiz axın** ilə işləyir:

1. əvvəl `prisma migrate deploy` yoxlayır
2. əgər baza boşdursa migration-ları normal tətbiq edir
3. əgər baza əvvəl `db push` ilə qurulubsa və `P3005` çıxırsa:
   - schema-nı təhlükəsiz `db push` ilə sinxronlaşdırır
   - mövcud migration-ları `applied` kimi baseline edir
   - sonra yenidən `migrate deploy` işlədir

Bu o deməkdir ki, `company_settings` kimi sonradan əlavə edilən cədvəllər də lokal bazada yaranacaq.

### Əgər migrate zamanı səhv çıxsa

`Authentication failed against database server`

- `apps/backend/.env` içindəki şifrə düzgün deyil

`database "bestapp" does not exist`

- əvvəl `CREATE DATABASE bestapp;` işlə

`The table public.company_settings does not exist`

- əvvəlki köhnə lokal baza migration-sız qalıb
- indi bunun həlli üçün yenə sadəcə bunu işlə:

```powershell
npm run db:migrate
```

## 8. Seed işə sal

```powershell
npm run db:seed
```

Bu komanda:

- rolları
- admin istifadəçini
- əsas reference data-nı
- demo məlumatları

yaradır.

## 9. Backend-i aç

Birinci terminalda:

```powershell
npm run dev:backend
```

Açılmalıdır:

- `http://localhost:3000`
- `http://localhost:3000/docs`

## 10. Frontend-i aç

İkinci PowerShell pəncərəsi aç və yenə layihə qovluğuna keç:

```powershell
cd C:\Users\USER\Desktop\BestApp
npm run dev:frontend
```

Açılmalıdır:

- `http://localhost:5173`

## 11. Login et

Brauzerdə frontend-i aç və daxil ol:

- Email: `admin@bestapp.local`
- Password: `Admin123!`

## 12. Tam düzgün sıra

Ən sadə işləyən sıra budur:

```powershell
cd C:\Users\USER\Desktop\BestApp
npm install
npm run setup:local
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev:backend
```

Sonra ikinci terminalda:

```powershell
cd C:\Users\USER\Desktop\BestApp
npm run dev:frontend
```

## 13. Qısa izah: `db:migrate` nə edir?

Root `package.json` içində:

```json
"db:migrate": "node scripts/prisma-migrate-local.mjs"
```

Bu script:

- migration fayllarını yoxlayır
- lokal qeyri-boş bazanı baseline edir
- yeni cədvəlləri və sütunları təhlükəsiz şəkildə sinxronlaşdırır

Yəni bu komanda Windows lokal development üçün əsas komandadır.

## 14. Yoxlama nəticəsi

Lokal bazada bu cədvəl yoxlanılıb və mövcuddur:

- `public.company_settings`

Bu səbəbdən `settings.service.ts` içindəki:

```ts
this.prisma.companySetting.upsert()
```

artıq migration tətbiq edildikdən sonra normal işləməlidir.
