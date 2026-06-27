import { useState } from 'react';
import { Calculator, Layers3, Menu, Package2, SquareStack, Warehouse, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { mobileNavOverlayClass, pageShellClass } from '../styles';

const navItems = [
  { to: '/materials', label: 'Materiallar', icon: SquareStack },
  { to: '/material-category-parameters', label: 'Kateqoriya parametrləri', icon: Layers3 },
  { to: '/calculations', label: 'Hesablama', icon: Calculator },
  { to: '/purchases', label: 'Alış', icon: Package2 },
  { to: '/warehouse', label: 'Anbar', icon: Warehouse }
];

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className={pageShellClass}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-glow-pulse absolute left-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="animate-glow-pulse absolute right-[-5rem] top-24 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="animate-float-soft absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {mobileNavOpen ? (
          <div className={mobileNavOverlayClass} onClick={() => setMobileNavOpen(false)} />
        ) : null}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-white/10 bg-slate-950/75 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          ].join(' ')}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
                <Package2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">NEON575</div>
                <div className="text-lg font-semibold text-white">Mətbəə ERP</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 lg:hidden"
              aria-label="Menyunu bağla"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Məqsəd</div>
              <div className="mt-2 text-sm leading-6 text-white/75">Material, alış, anbar və hesablama işləri üçün premium idarəetmə paneli.</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 pb-5">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 rounded-3xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5',
                      isActive
                        ? 'border-white/10 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 text-white shadow-lg shadow-violet-500/15'
                        : 'border-transparent text-white/70 hover:border-white/10 hover:bg-white/8 hover:text-white'
                    ].join(' ')
                  }
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/8 text-white/85 transition group-hover:bg-white/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/50 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/90 transition hover:bg-white/10 lg:hidden"
                  aria-label="Menyunu aç"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">NEON575</div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">Mətbəə idarəetmə sistemi</h1>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
                  Azərbaycan dili
                </div>
                <div className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                  Premium Dashboard
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1680px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="animate-fade-in space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
