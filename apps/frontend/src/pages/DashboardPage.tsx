import { Card } from '@bestapp/ui';
import { ArrowUpRight, FileText, Layers3, Wallet } from 'lucide-react';

const stats = [
  { label: 'Open orders', value: '128', icon: FileText },
  { label: 'In production', value: '34', icon: Layers3 },
  { label: 'Revenue MTD', value: '$42,850', icon: Wallet },
  { label: 'Margin', value: '28.4%', icon: ArrowUpRight }
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Order-centric operations view for production, finance, and inventory control.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                  <div className="mt-2 text-3xl font-semibold">{stat.value}</div>
                </div>
                <div className="rounded-2xl bg-slate-900 p-3 text-white">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <span className="text-sm text-slate-500">Live feed placeholder</span>
          </div>
          <div className="space-y-3">
            {['ORD-2026-0012', 'ORD-2026-0013', 'ORD-2026-0014'].map((order) => (
              <div key={order} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="font-medium">{order}</div>
                  <div className="text-sm text-slate-500">Customer and production details will appear here.</div>
                </div>
                <div className="text-sm font-medium text-slate-700">In production</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Operations</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Pricing pipeline ready.</p>
            <p>Production board scaffolded.</p>
            <p>Inventory and finance shells connected.</p>
            <p>Audit logging foundation enabled.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

