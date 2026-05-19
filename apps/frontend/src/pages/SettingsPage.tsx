import { APP_NAME } from '@bestapp/shared';
import { Card } from '@bestapp/ui';
import { PageHeader } from '../shared/components';

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Настройки" description="Служебные настройки и сведения о рабочем окружении." />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Проект</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Система: {APP_NAME}</p>
            <p>Архитектура: модульный монолит с поддержкой будущих микросервисов</p>
            <p>Фронтенд: React + TypeScript + Vite + TailwindCSS</p>
            <p>Бэкенд: NestJS + PostgreSQL + Prisma</p>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Рабочие роли</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Директор</p>
            <p>Менеджер</p>
            <p>Бухгалтер</p>
            <p>Склад</p>
            <p>Производство</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
