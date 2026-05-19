import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import type { InventoryMaterialItem, InventoryMovementItem, InventorySummary, WarehouseItem } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  StatCard,
  StatusBadge
} from '../shared/components';
import { useToast } from '../shared/toast/toast-context';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';

type InventoryAction = 'receipt' | 'reserve' | 'write_off' | 'adjustment';

type InventoryFormState = {
  materialId: string;
  warehouseId: string;
  quantity: number;
  orderId: string;
  reservationId: string;
  productionJobId: string;
  note: string;
  direction: 'increase' | 'decrease';
};

const emptyForm = (): InventoryFormState => ({
  materialId: '',
  warehouseId: '',
  quantity: 1,
  orderId: '',
  reservationId: '',
  productionJobId: '',
  note: '',
  direction: 'increase'
});

export function InventoryPage() {
  const toast = useToast();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<InventoryAction | null>(null);
  const [form, setForm] = useState<InventoryFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

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

  const lowStockMaterials = useMemo(() => summary?.materialsBelowMinimum ?? [], [summary]);

  const openAction = (nextAction: InventoryAction) => {
    setAction(nextAction);
    setForm(emptyForm());
    setFormError(null);
  };

  const closeAction = () => {
    setAction(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setError(null);

    try {
      if (!form.materialId || !form.warehouseId) {
        throw new Error('Выберите материал и склад');
      }

      if (action === 'reserve') {
        if (!form.orderId) {
          throw new Error('Для резерва нужен заказ');
        }

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
          orderId: form.orderId || undefined,
          productionJobId: form.productionJobId || undefined,
          quantity: Number(form.quantity),
          note: form.note
        });
      } else if (action === 'adjustment') {
        await inventoryClient.createMovement({
          materialId: form.materialId,
          warehouseId: form.warehouseId,
          type: 'adjustment',
          quantity: form.direction === 'decrease' ? -Math.abs(Number(form.quantity)) : Math.abs(Number(form.quantity)),
          note: form.note
        });
      } else if (action === 'receipt') {
        await inventoryClient.createMovement({
          materialId: form.materialId,
          warehouseId: form.warehouseId,
          type: 'purchase_in',
          quantity: Math.abs(Number(form.quantity)),
          note: form.note
        });
      }

      toast.success('Складская операция выполнена');
      closeAction();
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось выполнить складскую операцию';
      setFormError(message);
      toast.error('Не удалось выполнить складскую операцию', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        <PageHeader title="Склад" description="Остатки, движения и минимальные запасы." />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Склад"
        description="Складской контроль: остатки, резервы, списания и движения."
        actions={
          <>
            <Button variant="secondary" type="button" onClick={() => openAction('receipt')}>
              Приход
            </Button>
            <Button variant="secondary" type="button" onClick={() => openAction('reserve')}>
              Резерв
            </Button>
            <Button variant="secondary" type="button" onClick={() => openAction('write_off')}>
              Списание
            </Button>
            <Button type="button" onClick={() => openAction('adjustment')}>
              Корректировка
            </Button>
          </>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Всего материалов" value={String(summary?.totalMaterials ?? 0)} />
        <StatCard label="Мало на складе" value={String(summary?.lowStockCount ?? 0)} accent="rose" />
        <StatCard label="Стоимость запасов" value={formatCurrency(summary?.totalStockValue)} accent="emerald" />
        <StatCard label="Зарезервировано" value={formatCurrency(summary?.reservedValue)} accent="amber" />
        <StatCard label="Критических позиций" value={String(lowStockMaterials.length)} accent="sky" />
      </div>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Материалы</h2>
        <div className="mt-4">
          <DataTable
            rowKey={(row) => row.id}
            data={materials}
            columns={[
              { key: 'name', header: 'Название', render: (row) => row.name },
              { key: 'category', header: 'Категория', render: (row) => row.category?.name ?? '—' },
              { key: 'sku', header: 'Артикул', render: (row) => row.sku ?? '—' },
              { key: 'unit', header: 'Ед.', render: (row) => row.unit },
              { key: 'onHand', header: 'Остаток', render: (row) => formatNumber(row.onHand) },
              { key: 'reserved', header: 'Резерв', render: (row) => formatNumber(row.reserved) },
              { key: 'available', header: 'Доступно', render: (row) => formatNumber(row.available) },
              { key: 'min', header: 'Мин. запас', render: (row) => formatNumber(row.minStockLevel) },
              { key: 'cost', header: 'Себестоимость', render: (row) => formatCurrency(row.costPrice) },
              {
                key: 'state',
                header: 'Состояние',
                render: (row) => (
                  <StatusBadge
                    kind="custom"
                    status={row.available && row.available <= row.minStockLevel ? 'low_stock' : 'ok'}
                    label={row.available && row.available <= row.minStockLevel ? 'Мало на складе' : 'Норма'}
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
                    <StatusBadge kind="custom" status="low_stock" label="Мало на складе" />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Дефицита нет" description="Все материалы выше минимального уровня." />
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

      <Modal
        open={action !== null}
        title={
          action === 'receipt'
            ? 'Приход материала'
            : action === 'reserve'
              ? 'Резерв материала'
              : action === 'write_off'
                ? 'Списание материала'
                : 'Корректировка склада'
        }
        description="Заполните поля операции и сохраните движение склада."
        onClose={closeAction}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitAction}>
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
              required
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
            <Input type="number" min={1} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
          </Field>

          {action === 'reserve' ? (
            <Field label="Заказ">
              <Input value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} required />
            </Field>
          ) : null}

          {action === 'write_off' ? (
            <>
              <Field label="Резерв ID">
                <Input value={form.reservationId} onChange={(event) => setForm((current) => ({ ...current, reservationId: event.target.value }))} />
              </Field>
              <Field label="Заказ ID">
                <Input value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} />
              </Field>
              <Field label="Задание ID">
                <Input value={form.productionJobId} onChange={(event) => setForm((current) => ({ ...current, productionJobId: event.target.value }))} />
              </Field>
            </>
          ) : null}

          {action === 'adjustment' ? (
            <Field label="Тип корректировки">
              <select
                value={form.direction}
                onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value as InventoryFormState['direction'] }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="increase">Увеличить</option>
                <option value="decrease">Уменьшить</option>
              </select>
            </Field>
          ) : null}

          <Field label="Комментарий" className="md:col-span-2">
            <Input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          </Field>

          {formError ? <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeAction}>
              Отмена
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Выполняем...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
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
