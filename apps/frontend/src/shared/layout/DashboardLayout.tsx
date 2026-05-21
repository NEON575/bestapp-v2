import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BadgeDollarSign,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Factory,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ScanSearch,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  SquareStack,
  Users2,
  WalletCards,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@bestapp/ui';
import { useAuth } from '../auth/auth-context';
import { useLanguage } from '../i18n/language-context';
import { canAccess } from '../lib/access';
import { initials } from '../lib/format';

type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
  roles?: string[];
};

const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', labelKey: 'nav.orders', icon: FileSpreadsheet },
  { to: '/sales', labelKey: 'nav.sales', icon: ReceiptText },
  { to: '/customers', labelKey: 'nav.customers', icon: Users2 },
  { to: '/production', labelKey: 'nav.production', icon: Factory, roles: ['super_admin', 'owner', 'manager', 'production'] },
  { to: '/inventory', labelKey: 'nav.inventory', icon: Boxes, roles: ['super_admin', 'owner', 'manager', 'warehouse'] },
  { to: '/materials', labelKey: 'nav.materials', icon: SquareStack, roles: ['super_admin', 'owner', 'manager', 'warehouse'] },
  { to: '/import-excel', labelKey: 'nav.import', icon: ScanSearch, roles: ['super_admin', 'owner', 'manager', 'accountant'] },
  { to: '/finance', labelKey: 'nav.finance', icon: CircleDollarSign, roles: ['super_admin', 'owner', 'accountant'] },
  { to: '/customer-debts', labelKey: 'nav.customerDebts', icon: BadgeDollarSign, roles: ['super_admin', 'owner', 'manager', 'accountant'] },
  { to: '/supplier-debts', labelKey: 'nav.supplierDebts', icon: WalletCards, roles: ['super_admin', 'owner', 'manager', 'accountant'] },
  { to: '/purchases', labelKey: 'nav.purchases', icon: ShoppingCart, roles: ['super_admin', 'owner', 'manager', 'accountant', 'warehouse'] },
  { to: '/salaries', labelKey: 'nav.salaries', icon: ReceiptText, roles: ['super_admin', 'owner', 'accountant'] },
  { to: '/debts', labelKey: 'nav.debts', icon: BadgeDollarSign, roles: ['super_admin', 'owner', 'manager', 'accountant'] },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings2, roles: ['super_admin', 'owner'] }
];

const roleLabels: Record<string, string> = {
  super_admin: 'Super admin',
  owner: 'Rəhbər',
  manager: 'Menecer',
  accountant: 'Mühasib',
  warehouse: 'Anbar',
  production: 'İstehsal',
  cashier: 'Kassa'
};

export function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { session, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const userLabel = useMemo(() => {
    if (!session) {
      return 'İstifadəçi';
    }

    return session.user.fullName || session.user.email;
  }, [session]);

  const visibleNavItems = useMemo(() => {
    const roles = session?.user.roles ?? [];
    return navItems.filter((item) => !item.roles || canAccess(roles, item.roles));
  }, [session]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">BestApp</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{t('layout.title', 'Çap evi idarəetməsi')}</h2>
          <p className="mt-1 text-xs text-slate-500">{t('layout.subtitle', 'Satış, istehsal, anbar və maliyyə axını bir paneldə')}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Menyunu bağla"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4" />
              <span>{t(item.labelKey, item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              {initials(session?.user.fullName ?? session?.user.email ?? 'BA')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{session?.user.fullName ?? 'İstifadəçi'}</p>
              <p className="truncate text-xs text-slate-500">{session?.user.email ?? '—'}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {session?.user.roles.slice(0, 3).map((role) => (
              <span
                key={role}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                {roleLabels[role] ?? role}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_25%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 border-r border-slate-200 bg-white/80 shadow-sm lg:sticky lg:top-0 lg:block lg:h-screen">
          {sidebarContent}
        </aside>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/35"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Menyunu bağla"
            />
            <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-sm border-r border-slate-200 bg-white shadow-2xl">
              {sidebarContent}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Menyunu aç"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">ERP / MIS</p>
                  <h1 className="truncate text-lg font-semibold text-slate-950">{t('layout.headerTitle', 'Çap evi əməliyyat paneli')}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => navigate('/orders/new')}>
                  {t('layout.newOrder', 'Yeni sifariş')}
                </Button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((value) => !value)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
                      {initials(userLabel)}
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <div className="truncate text-sm font-semibold text-slate-950">{userLabel}</div>
                      <div className="truncate text-xs text-slate-500">
                        {session?.user.roles.slice(0, 2).map((role) => roleLabels[role] ?? role).join(' • ') || 'Rol təyin olunmayıb'}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {userMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-200 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                            {initials(userLabel)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{userLabel}</p>
                            <p className="truncate text-xs text-slate-500">{session?.user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                          onClick={() => navigate('/settings')}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {t('layout.security', 'Giriş və rol ayarları')}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4" />
                          {t('layout.logout', 'Çıxış')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
