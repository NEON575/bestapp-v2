import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
  CreateStockMovementDto,
  InventoryMaterialItem,
  InventoryMovementItem,
  InventorySummary,
  MaterialCategoryItem,
  MaterialQueryDto,
  WarehouseItem
} from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type InventoryActionType = 'purchase_in' | 'write_off' | 'adjustment' | 'reserve' | 'waste';
type MovementTab = 'all' | InventoryActionType;

type MovementDraft = {
  date: string;
  materialId: string;
  warehouseId: string;
  quantity: string;
  orderId: string;
  note: string;
  reference: string;
  direction: 'increase' | 'decrease';
};

const movementLabels: Record<InventoryActionType, string> = {
  purchase_in: 'Giriş',
  write_off: 'Çıxış',
  adjustment: 'Düzəliş',
  reserve: 'Rezerv',
  waste: 'Fire / zay'
};

const movementBadgeClasses: Record<string, string> = {
  purchase_in: 'bg-emerald-50 text-emerald-700',
  write_off: 'bg-rose-50 text-rose-700',
  adjustment: 'bg-sky-50 text-sky-700',
  reserve: 'bg-amber-50 text-amber-700',
  waste: 'bg-slate-200 text-slate-700'
};

function emptyMovementDraft(defaultWarehouseId = ''): MovementDraft {
  return {
    date: new Date().toISOString().slice(0, 10),
    materialId: '',
    warehouseId: defaultWarehouseId,
    quantity: '',
    orderId: '',
    note: '',
    reference: '',
    direction: 'increase'
  };
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

export function InventoryPage() {
  const toast = useToast();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<MaterialQueryDto>({
    page: 1,
    limit: 20,
    search: '',
    categoryId: '',
    lowStockOnly: false,
    stockState: undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [movementTab, setMovementTab] = useState<MovementTab>('all');
  const [action, setAction] = useState<InventoryActionType | null>(null);
  const [form, setForm] = useState<MovementDraft>(emptyMovementDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, materialsResponse, movementsResponse, categoriesResponse, warehousesResponse] = await Promise.all([
        inventoryClient.summary(),
        inventoryClient.materials(nextQuery),
        inventoryClient.movements({ page: 1, limit: 30, sortBy: 'createdAt', sortOrder: 'desc' }),
        inventoryClient.categories(),
        inventoryClient.warehouses()
      ]);

      setSummary(summaryResponse);
      setMaterials(materialsResponse.data);
      setMeta(materialsResponse.meta);
      setMovements(movementsResponse.data);
      setCategories(categoriesResponse);
      setWarehouses(warehousesResponse);
      setForm((current) => ({
        ...current,
        warehouseId: current.warehouseId || warehousesResponse[0]?.id || ''
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Anbar məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.categoryId, query.lowStockOnly, query.stockState]);

  const movementRows = useMemo(
    () => (movementTab === 'all' ? movements : movements.filter((item) => item.type === movementTab)),
    [movementTab, movements]
  );

  const openAction = (nextAction: InventoryActionType) => {
    setAction(nextAction);
    setForm(emptyMovementDraft(warehouses[0]?.id ?? ''));
  };

  const closeAction = () => {
    setAction(null);
    setForm(emptyMovementDraft(warehouses[0]?.id ?? ''));
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;

    setSaving(true);
    try {
      const date = toIsoDate(form.date);

      if (action === 'reserve') {
        if (!form.orderId) {
          throw new Error('Rezerv üçün sifariş ID vacibdir');
        }

        await inventoryClient.reserve({
          orderId: form.orderId,
          materialId: form.materialId,
          warehouseId: form.warehouseId,
          quantity: toNumber(form.quantity),
          note: form.note || undefined,
          date
        });
      } else {
        const payload: CreateStockMovementDto = {
          materialId: form.materialId,
          warehouseId: form.warehouseId || undefined,
          orderId: form.orderId || undefined,
          type: action,
          quantity:
            action === 'adjustment'
              ? form.direction === 'decrease'
                ? -Math.abs(toNumber(form.quantity))
                : Math.abs(toNumber(form.quantity))
              : Math.abs(toNumber(form.quantity)),
          reference: form.reference || undefined,
          note: form.note || undefined,
          date
        };

        if (action === 'write_off') {
          await inventoryClient.writeOff({
            materialId: payload.materialId,
            warehouseId: payload.warehouseId,
            orderId: payload.orderId,
            quantity: Math.abs(payload.quantity),
            note: payload.note,
            date: payload.date
          });
        } else {
          await inventoryClient.createMovement(payload);
        }
      }

      toast.success('Anbar əməliyyatı saxlanıldı');
      closeAction();
      await load(query);
    } catch (saveError) {
      toast.error('Anbar əməliyyatı saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return <LoadingState rows={6} />;
  }

  if (error && !summary) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Anbar"
        description="Material qalığı, rezervlər və bütün anbar hərəkətləri burada izlənir."
        actions={
          <>
            <Button variant="secondary" onClick={() => openAction('purchase_in')}>
              Giriş
            </Button>
            <Button variant="secondary" onClick={() => openAction('reserve')}>
              Rezerv
            </Button>
            <Button variant="secondary" onClick={() => openAction('write_off')}>
              Çıxış
            </Button>
            <Button variant="secondary" onClick={() => openAction('adjustment')}>
              Düzəliş
            </Button>
            <Button onClick={() => openAction('waste')}>Fire / zay</Button>
          </>
        }
      />

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Material sayı" value={String(summary?.totalMaterials ?? 0)} />
        <SummaryCard label="Az qalanlar" value={String(summary?.lowStockCount ?? 0)} tone="rose" />
        <SummaryCard label="Ümumi stok dəyəri" value={formatCurrency(summary?.totalStockValue)} tone="emerald" />
        <SummaryCard label="Rezerv dəyəri" value={formatCurrency(summary?.reservedValue)} tone="amber" />
        <SummaryCard label="Son hərəkətlər" value={String(summary?.recentMovements.length ?? 0)} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-5">
          <Field label="Axtarış">
            <Input value={query.search ?? ''} onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Material, kod və ya ölçü" />
          </Field>
          <Field label="Kateqoriya">
            <select value={query.categoryId ?? ''} onChange={(event) => setQuery((current) => ({ ...current, categoryId: event.target.value, page: 1 }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="">Bütün kateqoriyalar</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={Boolean(query.lowStockOnly)} onChange={(event) => setQuery((current) => ({ ...current, lowStockOnly: event.target.checked, page: 1 }))} />
            Az qalanlar
          </label>
          <button type="button" onClick={() => setQuery((current) => ({ ...current, stockState: current.stockState === 'positive' ? undefined : 'positive', page: 1 }))} className={`rounded-xl border px-4 py-3 text-left text-sm ${query.stockState === 'positive' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            Qalıq &gt; 0
          </button>
          <button type="button" onClick={() => setQuery((current) => ({ ...current, stockState: current.stockState === 'zero' ? undefined : 'zero', page: 1 }))} className={`rounded-xl border px-4 py-3 text-left text-sm ${query.stockState === 'zero' ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            Qalıq = 0
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1250px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Material', 'Kateqoriya', 'Vahid', 'Qalıq', 'Rezerv', 'Mövcud', 'Minimum qalıq', 'Son alış qiyməti', 'Orta qiymət', 'Son hərəkət tarixi'].map((header) => (
                  <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.length ? materials.map((material) => (
                <tr key={material.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{material.name}</div>
                    <div className="text-xs text-slate-500">{material.sku ?? 'Kod yoxdur'}</div>
                  </td>
                  <td className="px-4 py-3">{material.category?.name ?? '—'}</td>
                  <td className="px-4 py-3">{material.stockUnit ?? material.unit}</td>
                  <td className="px-4 py-3">{formatNumber(material.onHand)}</td>
                  <td className="px-4 py-3">{formatNumber(material.reserved)}</td>
                  <td className={`px-4 py-3 font-semibold ${Number(material.available ?? 0) <= Number(material.minStockLevel ?? 0) ? 'text-rose-600' : 'text-slate-900'}`}>{formatNumber(material.available)}</td>
                  <td className="px-4 py-3">{formatNumber(material.minStockLevel)}</td>
                  <td className="px-4 py-3">{formatCurrency(material.lastPurchasePrice)}</td>
                  <td className="px-4 py-3">{formatCurrency(material.averageCost)}</td>
                  <td className="px-4 py-3 text-slate-500">{material.lastMovementAt ? formatDateOnly(material.lastMovementAt) : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8">
                    <EmptyState title="Material tapılmadı" description="Filtrləri dəyişin və ya Alış bölməsindən material üçün giriş yaradın." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Anbar hərəkətləri</h2>
            <p className="mt-1 text-sm text-slate-500">Giriş, çıxış, düzəliş, rezerv və fire əməliyyatları eyni jurnalda görünür.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ key: 'all', label: 'Hamısı' }, ...Object.entries(movementLabels).map(([key, label]) => ({ key, label }))].map((item) => (
              <button key={item.key} type="button" onClick={() => setMovementTab(item.key as MovementTab)} className={`rounded-full px-4 py-2 text-sm font-medium ${movementTab === item.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Tarix', 'Material', 'Miqdar', 'Səbəb / istinad', 'Əlaqəli sifariş', 'Qeyd', 'Hərəkət'].map((header) => (
                  <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movementRows.length ? movementRows.map((movement) => (
                <tr key={movement.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{movement.createdAt ? formatDateOnly(movement.createdAt) : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">{movement.material?.name ?? '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${Number(movement.balanceDelta ?? movement.quantity) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatNumber(movement.balanceDelta ?? movement.quantity)}
                  </td>
                  <td className="px-4 py-3">{movement.reference ?? '—'}</td>
                  <td className="px-4 py-3">{movement.order?.number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{movement.note ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${movementBadgeClasses[movement.type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {movementLabels[movement.type as InventoryActionType] ?? movement.type}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <EmptyState title="Hərəkət yoxdur" description="İlk əməliyyatdan sonra jurnal burada görünəcək." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={action !== null}
        title={action ? `${movementLabels[action]} əməliyyatı` : 'Anbar əməliyyatı'}
        description="Tarix, material, miqdar və səbəbi qeyd edin. Sistem anbar qalığını avtomatik yeniləyəcək."
        onClose={closeAction}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitAction}>
          <Field label="Tarix">
            <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          </Field>

          <Field label="Anbar">
            <select value={form.warehouseId} onChange={(event) => setForm((current) => ({ ...current, warehouseId: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" required>
              <option value="">Anbar seçin</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Material" className="md:col-span-2">
            <select value={form.materialId} onChange={(event) => setForm((current) => ({ ...current, materialId: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" required>
              <option value="">Material seçin</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Miqdar">
            <Input type="number" min="0" step="0.0001" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
          </Field>

          {action === 'adjustment' ? (
            <Field label="İstiqamət">
              <select value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value as MovementDraft['direction'] }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                <option value="increase">Artır</option>
                <option value="decrease">Azalt</option>
              </select>
            </Field>
          ) : null}

          {action === 'reserve' || action === 'write_off' ? (
            <Field label="Əlaqəli sifariş">
              <Input value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} placeholder="Order ID və ya sifariş əlaqəsi" />
            </Field>
          ) : null}

          <Field label="Səbəb / istinad">
            <Input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Məs: alış, inventar, daxili istifadə" />
          </Field>

          <Field label="Qeyd" className="md:col-span-2">
            <Input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Əlavə qeyd" />
          </Field>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeAction}>
              Bağla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saxlanılır...' : 'Yadda saxla'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'rose' | 'emerald' | 'amber' }) {
  const colorClass = tone === 'rose' ? 'text-rose-600' : tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-950';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

function InlineAlert({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{children}</div>;
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
