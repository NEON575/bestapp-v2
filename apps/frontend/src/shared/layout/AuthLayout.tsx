import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.7),transparent_55%)]" />
        <div className="relative z-10">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-300">BestApp ERP</p>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight">
            Production-grade ERP for a modern printing house.
          </h1>
          <p className="mt-6 max-w-lg text-slate-300">
            Order-centric workflows, inventory discipline, production control, and finance
            visibility in one modular system.
          </p>
        </div>
        <div className="relative z-10 grid gap-4 text-sm text-slate-300">
          <div>Orders, production, inventory, finance, CRM.</div>
          <div>Responsive desktop, tablet, mobile and PWA-ready.</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

