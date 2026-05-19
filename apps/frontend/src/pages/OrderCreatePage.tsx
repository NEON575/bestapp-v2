import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateCustomerDto, CreateOrderDto, CreateOrderItemDto, CustomerListItem, InventoryMaterialItem } from '@bestapp/shared';
import { OrderItemColorMode } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { inventoryClient } from '../shared/api/inventory';
import { ordersClient } from '../shared/api/orders';
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';
import { formatCurrency } from '../shared/lib/format';

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

const emptyCustomer = (): CreateCustomerDto => ({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
});

export function OrderCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customerForm, setCustomerForm] = useState<CreateCustomerDto>(emptyCustomer());
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

  const orderTotals = useMemo(() => {
    const items = form.items ?? [];
    const totalPrice = items.reduce((sum, item) => sum + Number(item.totalPrice ?? 0), 0);
    const totalCost = items.reduce((sum, item) => sum + Number(item.totalCost ?? 0), 0);
    return {
      totalPrice,
      totalCost,
      profit: totalPrice - totalCost
    };
  }, [form.items]);

  const updateItem = (index: number, patch: Partial<CreateOrderItemDto>) => {
    setForm((current) => ({
      ...current,
      items: (current.items ?? []).map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        const next = { ...item, ...patch };
        const quantity = Number(next.quantity ?? 0);
        const unitPrice = Number(next.unitPrice ?? 0);
        const unitCost = Number(next.unitCost ?? 0);
        return {
          ...next,
          quantity,
          unitPrice,
          unitCost,
          totalPrice: quantity * unitPrice,
          totalCost: quantity * unitCost
        };
      })
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.customerId) {
      nextErrors.customerId = 'Выберите клиента';
    }
    if (!form.deadlineAt) {
      nextErrors.deadlineAt = 'Укажите дедлайн';
    }

    (form.items ?? []).forEach((item, index) => {
      if (!item.name) nextErrors[`items.${index}.name`] = 'Укажите название позиции';
      if (!item.productType) nextErrors[`items.${index}.productType`] = 'Укажите тип продукта';
      if (!item.quantity || item.quantity <= 0) nextErrors[`items.${index}.quantity`] = 'Количество должно быть больше 0';
      if (!item.unitPrice && item.unitPrice !== 0) nextErrors[`items.${index}.unitPrice`] = 'Укажите цену';
      if (!item.width || item.width <= 0) nextErrors[`items.${index}.width`] = 'Укажите ширину';
      if (!item.height || item.height <= 0) nextErrors[`items.${index}.height`] = 'Укажите высоту';
    });

    if (!(form.items?.length ?? 0)) {
      nextErrors.items = 'Добавьте хотя бы одну позицию';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      toast.warning('Проверьте форму заказа', 'Заполните обязательные поля перед сохранением.');
      return;
    }

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
      toast.success('Заказ создан', `Документ ${created.number} готов к дальнейшей работе.`);
      navigate(`/orders/${created.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось создать заказ';
      setError(message);
      toast.error('Не удалось создать заказ', message);
    } finally {
      setSaving(false);
    }
  };

  const createCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCustomerSaving(true);
    try {
      const created = await customersClient.create(customerForm);
      setCustomers((current) => [created, ...current]);
      setForm((current) => ({ ...current, customerId: created.id }));
      setCustomerForm(emptyCustomer());
      setShowCustomerModal(false);
      toast.success('Клиент создан', created.name);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось создать клиента';
      toast.error('Не удалось создать клиента', message);
    } finally {
      setCustomerSaving(false);
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
        description="Расширяемая форма создания заказа с клиентом, позициями и автоматическим расчетом сумм."
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

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Клиент" error={formErrors.customerId}>
            <div className="flex gap-2">
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
              <Button type="button" variant="secondary" onClick={() => setShowCustomerModal(true)}>
                Быстрый клиент
              </Button>
            </div>
          </Field>

          <Field label="Менеджер ID">
            <Input
              value={form.managerId ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
              placeholder="ID менеджера"
            />
          </Field>

          <Field label="Дедлайн" error={formErrors.deadlineAt}>
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
              placeholder="Комментарий к заказу"
            />
          </Field>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Позиции заказа</h2>
            <p className="text-sm text-slate-500">Можно добавить несколько строк, а суммы считаются автоматически.</p>
          </div>
          <Button type="button" variant="secondary" onClick={addItem}>
            Добавить позицию
          </Button>
        </div>

        {formErrors.items ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{formErrors.items}</div>
        ) : null}

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
                <Field label="Название продукта" error={formErrors[`items.${index}.name`]}>
                  <Input value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} />
                </Field>
                <Field label="Тип продукта" error={formErrors[`items.${index}.productType`]}>
                  <Input value={item.productType} onChange={(event) => updateItem(index, { productType: event.target.value })} />
                </Field>
                <Field label="Материал">
                  <select
                    value={item.materialId ?? ''}
                    onChange={(event) => updateItem(index, { materialId: event.target.value })}
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
                <Field label="Ширина" error={formErrors[`items.${index}.width`]}>
                  <Input type="number" value={item.width} onChange={(event) => updateItem(index, { width: Number(event.target.value) })} />
                </Field>
                <Field label="Высота" error={formErrors[`items.${index}.height`]}>
                  <Input type="number" value={item.height} onChange={(event) => updateItem(index, { height: Number(event.target.value) })} />
                </Field>
                <Field label="Количество" error={formErrors[`items.${index}.quantity`]}>
                  <Input type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
                </Field>
                <Field label="Цветность">
                  <select
                    value={item.colorMode}
                    onChange={(event) => updateItem(index, { colorMode: event.target.value as CreateOrderItemDto['colorMode'] })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    {Object.values(OrderItemColorMode).map((mode) => (
                      <option key={mode} value={mode}>
                        {getColorModeLabel(mode)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Постобработка">
                  <Input value={item.finishingOptions ?? ''} onChange={(event) => updateItem(index, { finishingOptions: event.target.value })} />
                </Field>
                <Field label="Цена за единицу" error={formErrors[`items.${index}.unitPrice`]}>
                  <Input type="number" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })} />
                </Field>
                <Field label="Себестоимость за единицу">
                  <Input type="number" value={item.unitCost ?? 0} onChange={(event) => updateItem(index, { unitCost: Number(event.target.value) })} />
                </Field>
                <Field label="Комментарий">
                  <Input value={item.comment ?? ''} onChange={(event) => updateItem(index, { comment: event.target.value })} />
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Сумма строки: <span className="font-semibold text-slate-950">{formatCurrency(item.totalPrice)}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Себестоимость строки: <span className="font-semibold text-slate-950">{formatCurrency(item.totalCost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <Summary label="Сумма заказа" value={formatCurrency(orderTotals.totalPrice)} />
          <Summary label="Себестоимость" value={formatCurrency(orderTotals.totalCost)} />
          <Summary label="Прибыль" value={formatCurrency(orderTotals.profit)} />
        </div>
      </Card>

      <Modal
        open={showCustomerModal}
        title="Быстрый клиент"
        description="Создайте клиента без выхода из формы заказа."
        onClose={() => setShowCustomerModal(false)}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createCustomer}>
          <Field label="Имя">
            <Input value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} required />
          </Field>
          <Field label="Компания">
            <Input value={customerForm.companyName ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, companyName: event.target.value }))} />
          </Field>
          <Field label="Телефон">
            <Input value={customerForm.phone ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} />
          </Field>
          <Field label="Электронная почта">
            <Input value={customerForm.email ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} />
          </Field>
          <Field label="Адрес" className="md:col-span-2">
            <Input value={customerForm.address ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} />
          </Field>
          <Field label="Заметки" className="md:col-span-2">
            <Input value={customerForm.notes ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCustomerModal(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={customerSaving}>
              {customerSaving ? 'Создаем...' : 'Создать клиента'}
            </Button>
          </div>
        </form>
      </Modal>
    </form>
  );
}

function Field({
  label,
  children,
  error,
  className
}: {
  label: string;
  children: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function getColorModeLabel(mode: OrderItemColorMode) {
  switch (mode) {
    case OrderItemColorMode.CMYK:
      return 'CMYK';
    case OrderItemColorMode.RGB:
      return 'RGB';
    case OrderItemColorMode.SPOT:
      return 'Pantone / Spot';
    case OrderItemColorMode.GRAYSCALE:
      return 'Градации серого';
    default:
      return mode;
  }
}
