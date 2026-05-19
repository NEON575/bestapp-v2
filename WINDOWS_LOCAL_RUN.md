# BestApp: запуск на Windows без Docker

Эта инструкция нужна, если Docker Desktop или WSL на Windows работает нестабильно. Ниже описан полностью локальный запуск проекта через Node.js и PostgreSQL.

## 1. Установить Node.js

1. Скачай и установи **Node.js LTS** с официального сайта.
2. После установки проверь версию:

```powershell
node -v
npm -v
```

## 2. Установить PostgreSQL

1. Установи PostgreSQL для Windows.
2. Во время установки запомни пароль пользователя `postgres`.
3. После установки проверь, что сервер запущен.

Рекомендуемые параметры:

- host: `localhost`
- port: `5432`
- user: `postgres`
- password: `postgres`
- database: `bestapp`

## 3. Создать базу данных

Открой `psql` или `pgAdmin` и создай базу:

```sql
CREATE DATABASE bestapp;
```

Если пользователя `postgres` с паролем `postgres` еще нет, создай или настрой его в PostgreSQL.

## 4. Установить зависимости

В корне проекта:

```powershell
npm install
```

## 5. Создать локальные `.env` файлы

Скрипт создаст локальные env-файлы из примеров:

```powershell
npm run setup:local
```

Если нужно, можно заполнить вручную:

### `apps/backend/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bestapp?schema=public
JWT_SECRET=super-secret-dev-key-change-me
JWT_EXPIRES_IN=1d
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### `apps/frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## 6. Сгенерировать Prisma client

```powershell
npm run prisma:generate -w @bestapp/backend
```

## 7. Применить миграции

```powershell
npm run db:migrate
```

Если база пустая, Prisma создаст нужные таблицы.

## 8. Засеять тестовые данные

```powershell
npm run db:seed
```

После этого появятся роли, тестовый админ и базовые справочники.

## 9. Запустить backend

```powershell
npm run dev:backend
```

Backend будет доступен по адресу:

- `http://localhost:3000`

Swagger:

- `http://localhost:3000/docs`

## 10. Запустить frontend

В новом окне терминала:

```powershell
npm run dev:frontend
```

Frontend будет доступен по адресу:

- `http://localhost:5173`

## 11. Проверить вход

Используй учетные данные:

- Email: `admin@bestapp.local`
- Password: `Admin123!`

## 12. Полная последовательность команд для PowerShell

```powershell
npm install
npm run setup:local
npm run prisma:generate -w @bestapp/backend
npm run db:migrate
npm run db:seed
npm run dev:backend
```

В другом окне терминала:

```powershell
npm run dev:frontend
```

## 13. Полезные URL

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## 14. Docker

Docker остается дополнительным способом запуска, но для Windows теперь есть полноценный локальный путь без него.
