import { Calculator, Layers3, Package2, SquareStack, Warehouse } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/materials', label: 'Materiallar', icon: SquareStack },
  { to: '/material-category-parameters', label: 'Kateqoriya parametrləri', icon: Layers3 },
  { to: '/calculations', label: 'Hesablama', icon: Calculator },
  { to: '/purchases', label: 'Alış', icon: Package2 },
  { to: '/warehouse', label: 'Anbar', icon: Warehouse }
];

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Package2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">BestApp V2</div>
                <div className="text-lg font-semibold text-slate-950">Çap evi ERP</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                      isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Monorepo</div>
                <h1 className="text-xl font-semibold text-slate-950">Çap evi idarəetmə paneli</h1>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">Azərbaycan dili</div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
