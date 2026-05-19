import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Boxes,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  ScrollText,
  Wallet
} from 'lucide-react';
import { useAuth } from '../auth/auth-context';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ScrollText },
  { to: '/customers', label: 'Customers', icon: Building2 },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/production', label: 'Production', icon: Printer }
];

export function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { session, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/95 p-5 shadow-lg backdrop-blur transition-transform lg:static lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">BestApp</p>
              <h2 className="text-lg font-semibold">ERP / MIS</h2>
            </div>
            <button className="lg:hidden" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                    ].join(' ')
                  }
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden"
                  onClick={() => setOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <div className="text-sm text-slate-500">Welcome back</div>
                  <div className="font-semibold">{session?.user.fullName ?? 'User'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium">{session?.user.email}</div>
                  <div className="text-xs text-slate-500">{session?.user.roles.join(', ')}</div>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

