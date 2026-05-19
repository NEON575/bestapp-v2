import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import type { InventoryMaterialItem, InventoryMovementItem, InventorySummary, WarehouseItem } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge
} from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';

type QuickAction = 'movement' | 'reserve' | 'write_off';

export function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<QuickAction>('movement');
  const [form, setForm] = useState({
    materialId: '',
    warehouseId: '',
    quantity: 1,
    type: 'purchase_in',
    orderId: '',
    reservationId: '',
    note: ''
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResponse, materialsResponse, movementsResponse, warehousesResponse] = await Promise.all([
        inventoryClient.summary(),
        inventoryClient.materials({ page: 1, limit: 50 }),
        inventoryClient.movements({ page: 1, limit: 10 }),
        inventoryClient.warehouses()
      ]);

      setSummary(summaryResponse);
      setMaterials(materialsResponse.data);
      setMovements(movementsResponse.data);
      setWarehouses(warehousesResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить склад');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (action === 'reserve') {
        await inventoryClient.reserve({
          orderId: form.orderId,
          materialId: form.materialId,
          warehouseId: form.warehouseId,
          quantity: Number(form.quantity),
          note: form.note
        });
      } else if (action === 'write_off') {
        await inventoryClient.writeOff({
          materialId: form.materialId,
          warehouseId: form.warehouseId,
          reservationId: form.reservationId || undefined,
          quantity: Number(form.quantity),
          note: form.note
        });
      } else {
        await inventoryClient.createMovement({
          materialId: form.materialId,
          warehouseId: form.warehouseId,
          type: form.type,
          quantity: Number(form.quantity),
          note: form.note
        });
      }

      setForm((current) => ({ ...current, note: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить складскую операцию');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        <PageHeader title="Inventory" description="Остатки, движения и минимальные запасы." />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  const lowStockMaterials = summary?.materialsBelowMinimum ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Складской контроль: остатки, резервы, списания и движения."
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Всего материалов" value={String(summary?.totalMaterials ?? 0)} />
        <StatCard label="Low stock" value={String(summary?.lowStockCount ?? 0)} accent="rose" />
        <StatCard label="Stock value" value={formatCurrency(summary?.totalStockValue)} accent="emerald" />
        <StatCard label="Reserved value" value={formatCurrency(summary?.reservedValue)} accent="amber" />
        <StatCard label="Критических позиций" value={String(lowStockMaterials.length)} accent="sky" />
      </div>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Быстрое складское действие</h2>
            <p className="text-sm text-slate-500">Приход, резерв, списание и ручное движение склада.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['movement', 'reserve', 'write_off'] as const).map((item) => (
              <Button key={item} variant={action === item ? 'primary' : 'secondary'} type="button" onClick={() => setAction(item)}>
                {item === 'movement' ? 'Движение' : item === 'reserve' ? 'Резерв' : 'Списание'}
              </Button>
            ))}
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submitAction}>
          <Field label="Материал">
            <select
              value={form.materialId}
              onChange={(event) => setForm((current) => ({ ...current, materialId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              required
            >
              <option value="">Выберите материал</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Склад">
            <select
              value={form.warehouseId}
              onChange={(event) => setForm((current) => ({ ...current, warehouseId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Выберите склад</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Количество">
            <Input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
          </Field>
          {action === 'movement' ? (
            <Field label="Тип движения">
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="purchase_in">purchase_in</option>
                <option value="reserve">reserve</option>
                <option value="write_off">write_off</option>
                <option value="return">return</option>
                <option value="adjustment">adjustment</option>
                <option value="waste">waste</option>
              </select>
            </Field>
          ) : null}
          {action === 'reserve' ? (
            <Field label="Order ID">
              <Input value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} required />
            </Field>
          ) : null}
          {action === 'write_off' ? (
            <Field label="Reservation ID">
              <Input
                value={form.reservationId}
                onChange={(event) => setForm((current) => ({ ...current, reservationId: event.target.value }))}
                placeholder="Если списываете из резерва"
              />
            </Field>
          ) : null}
          <Field label="Комментарий">
            <Input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          </Field>
          <div className="md:col-span-2 xl:col-span-4 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Выполняем...' : 'Применить'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Материалы</h2>
        <div className="mt-4">
          <DataTable
            rowKey={(row) => row.id}
            data={materials}
            columns={[
              { key: 'name', header: 'Название', render: (row) => row.name },
              { key: 'category', header: 'Категория', render: (row) => row.category?.name ?? '—' },
              { key: 'sku', header: 'SKU', render: (row) => row.sku ?? '—' },
              { key: 'unit', header: 'Ед.', render: (row) => row.unit },
              { key: 'onHand', header: 'Остаток', render: (row) => formatNumber(row.onHand) },
              { key: 'reserved', header: 'Резерв', render: (row) => formatNumber(row.reserved) },
              { key: 'available', header: 'Доступно', render: (row) => formatNumber(row.available) },
              { key: 'min', header: 'Min stock', render: (row) => formatNumber(row.minStockLevel) },
              { key: 'cost', header: 'Себестоимость', render: (row) => formatCurrency(row.costPrice) },
              {
                key: 'state',
                header: 'Состояние',
                render: (row) => (
                  <StatusBadge
                    kind="movement"
                    status={row.available && row.available <= row.minStockLevel ? 'waste' : 'purchase_in'}
                    label={row.available && row.available <= row.minStockLevel ? 'Low' : 'OK'}
                  />
                )
              }
            ]}
            emptyState={<EmptyState title="Материалы не найдены" description="Добавьте материалы через backend API." />}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Ниже минимума</h2>
          <div className="mt-4 space-y-3">
            {lowStockMaterials.length ? (
              lowStockMaterials.map((material) => (
                <div key={material.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{material.name}</div>
                      <div className="text-xs text-slate-500">
                        Остаток {material.available} · Минимум {material.minStockLevel}
                      </div>
                    </div>
                    <StatusBadge kind="movement" status="adjustment" label="Low" />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Нет дефицита" description="Все материалы выше минимального уровня." />
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Последние движения</h2>
          <div className="mt-4 space-y-3">
            {movements.length ? (
              movements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{movement.material?.name ?? 'Материал'}</div>
                      <div className="text-xs text-slate-500">
                        {movement.quantity} · {movement.warehouse?.name ?? '—'} · {formatDateOnly(movement.createdAt)}
                      </div>
                    </div>
                    <StatusBadge kind="movement" status={movement.type} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Движений нет" description="Первые движения появятся после работы склада." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
