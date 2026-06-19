# Railway Deployment Guide

Bu sənəd `BestApp` layihəsini Railway-də online staging kimi işlətmək üçündür.

Məqsəd:

- lokal kompüterdən asılı olmamaq
- eyni link ilə evdən və işdən giriş etmək
- backend, frontend və PostgreSQL-i Railway üzərində ayrı servis kimi idarə etmək

## Arxitektura

- Backend: Railway Web Service
- Frontend: Railway Static Site / Vite build
- Database: Railway PostgreSQL

Backend API bazası:

- `GET /api/v1/health`

## 1. Railway account yaratmaq

1. [Railway](https://railway.app/) saytına daxil ol.
2. Hesab aç və ya mövcud hesabla login ol.
3. Yeni bir `Project` yarat.

## 2. GitHub repo qoşmaq

1. Project daxilində `Deploy from GitHub repo` seç.
2. `BestApp` repository-ni qoş.
3. Main branch olaraq `main` seç.

## 3. PostgreSQL service yaratmaq

1. Project daxilində `Add service` seç.
2. `Database` və ya `PostgreSQL` seç.
3. Railway-in yaratdığı PostgreSQL servisini saxla.

Bu servis backend üçün `DATABASE_URL` verəcək.

## 4. `DATABASE_URL` almaq

1. PostgreSQL servisinin `Variables` bölməsinə gir.
2. Railway-in verdiyi connection string-i kopyala.
3. Backend service üçün `DATABASE_URL` kimi əlavə et.

Nümunə format:

```env
DATABASE_URL=postgresql://...
```

## 5. Backend service env yazmaq

Backend servisini `Web Service` kimi yarat.

`Variables` bölməsində minimum bunlar olsun:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=uzun-ve-tesadufi-sirr
JWT_EXPIRES_IN=1d
NODE_ENV=production
CORS_ORIGIN=https://<frontend-railway-domain>
```

Qeyd:

- `PORT`-u əl ilə yazmaq lazım deyil, Railway onu avtomatik verir.
- Backend kodu `process.env.PORT` oxuyur.
- `CORS_ORIGIN`-ə frontend domain-i ver.
- Bir neçə domain lazımdırsa, vergül ilə ayır:

```env
CORS_ORIGIN=https://frontend.up.railway.app,https://custom-domain.com
```

## 6. Backend build/start command

Backend service üçün aşağıdakı dəyərləri ver:

### Build command

```bash
npm ci && npx prisma generate --schema apps/backend/prisma/schema.prisma && npm run build -w @bestapp/shared && npm run build -w @bestapp/ui && npm run build -w @bestapp/backend
```

### Start command

```bash
npm run start:prod -w @bestapp/backend
```

Backend artıq `dist/main.js`-dən işə düşəcək.

## 7. Prisma migration command

Railway-də migration-u deploy mərhələsində işə sal:

### Deploy / Pre-deploy command

```bash
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

Bu komanda `prisma migrate deploy` işlədir.

Əgər Railway UI yalnız bir command xanası göstərirsə:

- build üçün yuxarıdakı build command
- start üçün yuxarıdakı start command
- migration üçün isə deploy/pre-deploy mərhələsində `npm run prisma:migrate -w @bestapp/backend`

## 8. Frontend service env yazmaq

Frontend üçün Railway `Static Site` və ya Vite build üzərindən servis yarat.

### Frontend build command

```bash
npm ci && npm run build -w @bestapp/frontend
```

### Publish directory

```text
apps/frontend/dist
```

### Root directory

Repo root.

Frontend servisin `Variables` bölməsində:

```env
VITE_API_URL=https://<backend-railway-domain>
```

Bu dəyər backend-in public URL-i olmalıdır.

App daxilində bu URL avtomatik `/api/v1` ilə tamamlanır.

## 9. `VITE_API_URL` yazmaq

Nümunə:

```env
VITE_API_URL=https://bestapp-backend.up.railway.app
```

Əgər backend URL-in sonunda `/api/v1` yazmaq istəsən də işləyər:

```env
VITE_API_URL=https://bestapp-backend.up.railway.app/api/v1
```

## 10. Admin user yaratmaq

Seed admin-i manual işlət:

```bash
npx prisma db seed --schema apps/backend/prisma/schema.prisma
```

Bu komanda aşağıdakıları yaradır:

- admin user
- rollar
- demo reference data

Railway-də bunu bir dəfə, database ilk dəfə hazır olanda işə sal.

Ən rahat yol:

1. Backend deployment tamamlanandan sonra Railway shell aç.
2. Yuxarıdakı seed command-i işlə.

## 11. Login məlumatı

Default admin login:

- Email: `admin@bestapp.local`
- Password: `Admin123!`

## Yoxlama

Deploy bitəndən sonra bunları test et:

```bash
GET https://<backend-railway-domain>/api/v1/health
```

Qaytarmalıdır:

```json
{
  "status": "ok",
  "service": "bestapp-backend",
  "timestamp": "..."
}
```

Frontend linkindən login et və admin hesabı ilə daxil ol.

## Faydalı qeydlər

- Backend və frontend üçün fərqli Railway domain-lər istifadə et.
- CORS-da yalnız frontend domain-i açıq saxla.
- Schema dəyişəndə backend üçün yenidən migration command işlə.
- Seed-i təkrar işlətmək mümkündür, amma adətən yalnız ilk setup üçün lazımdır.
