import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateOrderDto, CreateOrderItemDto, CustomerListItem, InventoryMaterialItem } from '@bestapp/shared';
import { OrderItemColorMode } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { inventoryClient } from '../shared/api/inventory';
import { ordersClient } from '../shared/api/orders';
import { ErrorState, LoadingState, PageHeader } from '../shared/components';

const emptyItem = (): CreateOrderItemDto => ({
  name: '',
  productType: '',
  width: 0,
  height: 0,
  quantity: 1,
  colorMode: OrderItemColorMode.CMYK,
  materialId: '',
  finishingOptions: '',
  unitPrice: 0,
  totalPrice: 0,
  unitCost: 0,
  totalCost: 0,
  comment: ''
});

export function OrderCreatePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOrderDto>({
    customerId: '',
    managerId: '',
    status: 'draft',
    deadlineAt: '',
    comment: '',
    items: [emptyItem()]
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [customersResponse, materialsResponse] = await Promise.all([
          customersClient.list({ page: 1, limit: 100 }),
          inventoryClient.materials({ page: 1, limit: 100 })
        ]);
        setCustomers(customersResponse.data);
        setMaterials(materialsResponse.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить форму заказа');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const setItem = (index: number, patch: Partial<CreateOrderItemDto>) => {
    setForm((current) => ({
      ...current,
      items: current.items?.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...(current.items ?? []), emptyItem()]
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: (current.items ?? []).filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const recalculatePrice = (index: number) => {
    const item = form.items?.[index];
    if (!item) return;

    const totalPrice = Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
    const totalCost = Number(item.unitCost ?? 0) * Number(item.quantity ?? 0);
    setItem(index, {
      totalPrice,
      totalCost
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: CreateOrderDto = {
        ...form,
        items: (form.items ?? []).map((item) => ({
          ...item,
          width: Number(item.width),
          height: Number(item.height),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          unitCost: Number(item.unitCost ?? 0),
          totalCost: Number(item.totalCost ?? 0)
        }))
      };
      const created = await ordersClient.create(payload);
      navigate(`/orders/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать заказ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState rows={4} />;
  }

  if (error && !customers.length) {
    return <ErrorState description={error} onRetry={() => navigate('/orders/new')} />;
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        title="Новый заказ"
        description="Расширяемая форма создания заказа с позициями, сроком и менеджером."
        actions={
          <>
            <Button variant="secondary" type="button" onClick={() => navigate('/orders')}>
              Отмена
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Создаем...' : 'Создать заказ'}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Клиент">
            <select
              value={form.customerId}
              onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              required
            >
              <option value="">Выберите клиента</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Менеджер ID">
            <Input
              value={form.managerId ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
              placeholder="ID менеджера"
            />
          </Field>

          <Field label="Дедлайн">
            <Input
              type="date"
              value={form.deadlineAt ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, deadlineAt: event.target.value }))}
            />
          </Field>

          <Field label="Комментарий">
            <Input
              value={form.comment ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Комментарий"
            />
          </Field>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Позиции заказа</h2>
            <p className="text-sm text-slate-500">Пока базовая форма, но структура уже готова для расчета.</p>
          </div>
          <Button type="button" variant="secondary" onClick={addItem}>
            Добавить позицию
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {(form.items ?? []).map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-950">Позиция #{index + 1}</div>
                <Button type="button" variant="ghost" onClick={() => removeItem(index)} disabled={(form.items ?? []).length === 1}>
                  Удалить
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Название продукта">
                  <Input value={item.name} onChange={(event) => setItem(index, { name: event.target.value })} />
                </Field>
                <Field label="Тип продукта">
                  <Input value={item.productType} onChange={(event) => setItem(index, { productType: event.target.value })} />
                </Field>
                <Field label="Материал">
                  <select
                    value={item.materialId ?? ''}
                    onChange={(event) => setItem(index, { materialId: event.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">Без материала</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ширина">
                  <Input type="number" value={item.width} onChange={(event) => setItem(index, { width: Number(event.target.value) })} />
                </Field>
                <Field label="Высота">
                  <Input type="number" value={item.height} onChange={(event) => setItem(index, { height: Number(event.target.value) })} />
                </Field>
                <Field label="Количество">
                  <Input type="number" value={item.quantity} onChange={(event) => setItem(index, { quantity: Number(event.target.value) })} />
                </Field>
                <Field label="Цветность">
                  <select
                    value={item.colorMode}
                    onChange={(event) => setItem(index, { colorMode: event.target.value as CreateOrderItemDto['colorMode'] })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    {Object.values(OrderItemColorMode).map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Finishing options">
                  <Input value={item.finishingOptions ?? ''} onChange={(event) => setItem(index, { finishingOptions: event.target.value })} />
                </Field>
                <Field label="Unit price">
                  <Input type="number" value={item.unitPrice} onChange={(event) => setItem(index, { unitPrice: Number(event.target.value) })} />
                </Field>
                <Field label="Unit cost">
                  <Input type="number" value={item.unitCost ?? 0} onChange={(event) => setItem(index, { unitCost: Number(event.target.value) })} />
                </Field>
                <Field label="Comment">
                  <Input value={item.comment ?? ''} onChange={(event) => setItem(index, { comment: event.target.value })} />
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={() => recalculatePrice(index)}>
                  Пересчитать строку
                </Button>
                <div className="text-sm text-slate-500">
                  Сумма: <span className="font-semibold text-slate-950">{item.totalPrice ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </form>
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
