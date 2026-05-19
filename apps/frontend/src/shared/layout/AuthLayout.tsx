import { Outlet } from 'react-router-dom';
import { APP_NAME } from '@bestapp/shared';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.9),transparent_55%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">BestApp ERP / MIS</p>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight">
              Производственный контроль, склад, финансы и заказы в одном enterprise-контуре.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
              {APP_NAME} помогает типографии управлять заказом от расчета до выдачи: с точными
              остатками, финансовой дисциплиной, audit trail и производственными маршрутами.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-300 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              Сильная архитектура для growth, аналитики и будущего AI-помощника.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              Responsive desktop, tablet, mobile и PWA-ready рабочее место.
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

