import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateCustomerDto, CreateOrderDto, CustomerListItem, UserSummary } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { ordersClient } from '../shared/api/orders';
import { usersClient } from '../shared/api/users';
import { ErrorState, LoadingState, Modal, PageHeader } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';

const printColorOptions = ['1+0', '2+0', '4+0', '1+1', '2+2', '4+4', 'digər'];

function createEmptyCustomer(): CreateCustomerDto {
  return {
    name: '',
    companyName: '',
    phone: '',
    email: '',
    notes: '',
    inquiryNote: '',
    isActive: true
  };
}

function createInitialForm(): CreateOrderDto {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customerId: '',
    managerId: '',
    status: 'draft',
    date: today,
    deadlineAt: today,
    comment: '',
    items: [
      {
        name: '',
        quantity: 1,
        formatText: '',
        printColorText: '4+0',
        comment: ''
      }
    ]
  };
}

export function OrderCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [form, setForm] = useState<CreateOrderDto>(createInitialForm());
  const [customerForm, setCustomerForm] = useState<CreateCustomerDto>(createEmptyCustomer());
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [customersResponse, managersResponse] = await Promise.all([
          customersClient.list({ page: 1, limit: 200 }),
          usersClient.listManagers()
        ]);

        setCustomers(customersResponse.data);
        setManagers(managersResponse);
        setForm((current) => ({
          ...current,
          managerId: current.managerId || managersResponse[0]?.id || ''
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Sifariş forması yüklənmədi');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const updateItem = (patch: Partial<NonNullable<CreateOrderDto['items']>[number]>) => {
    setForm((current) => ({
      ...current,
      items: [
        {
          ...current.items?.[0],
          ...patch
        }
      ]
    }));
  };

  const validate = () => {
    const item = form.items?.[0];
    const nextErrors: Record<string, string> = {};

    if (!form.customerId) nextErrors.customerId = 'Müştəri seçin';
    if (!form.managerId) nextErrors.managerId = 'Menecer seçin';
    if (!form.date) nextErrors.date = 'Tarix seçin';
    if (!form.deadlineAt) nextErrors.deadlineAt = 'Təhvil tarixi seçin';
    if (!item?.name?.trim()) nextErrors.productName = 'Məhsulun adını yazın';
    if (!item?.quantity || Number(item.quantity) <= 0) nextErrors.quantity = 'Say 0-dan böyük olmalıdır';

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      toast.warning('Forma natamamdır', 'Vacib sahələri doldurun.');
      return;
    }

    const item = form.items?.[0];
    if (!item) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateOrderDto = {
        customerId: form.customerId,
        managerId: form.managerId,
        status: 'draft',
        date: form.date,
        deadlineAt: form.deadlineAt,
        comment: form.comment,
        items: [
          {
            name: item.name,
            quantity: Number(item.quantity),
            formatText: item.formatText || '',
            printColorText: item.printColorText || '4+0',
            comment: item.comment || ''
          }
        ]
      };

      const created = await ordersClient.create(payload);
      toast.success('Sifariş yaradıldı', created.number);
      navigate(`/orders/${created.id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Sifariş yaradılmadı';
      setError(message);
      toast.error('Sifariş yaradılmadı', message);
    } finally {
      setSaving(false);
    }
  };

  const createCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerForm.name.trim()) {
      toast.warning('Müştəri adı vacibdir');
      return;
    }

    setCustomerSaving(true);
    try {
      const created = await customersClient.create(customerForm);
      setCustomers((current) => [created, ...current]);
      setForm((current) => ({ ...current, customerId: created.id }));
      setCustomerForm(createEmptyCustomer());
      setShowCustomerModal(false);
      toast.success('Müştəri yaradıldı', created.name);
    } catch (createError) {
      toast.error('Müştəri yaradılmadı', createError instanceof Error ? createError.message : 'Xəta baş verdi');
    } finally {
      setCustomerSaving(false);
    }
  };

  if (loading) {
    return <LoadingState rows={4} />;
  }

  if (error && !customers.length) {
    return <ErrorState description={error} onRetry={() => window.location.reload()} />;
  }

  const item = form.items?.[0];

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageHeader
        title="Sifariş yarat"
        description="İşin qəbulunu sadə formada qeyd edin. Qiymət və maya dəyəri sonradan Satış və Hesablama bölməsində işlənəcək."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
              Geri
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Yaradılır...' : 'Sifarişi yarat'}
            </Button>
          </>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Müştəri" error={formErrors.customerId}>
            <div className="flex gap-2">
              <select
                value={form.customerId}
                onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Müştəri seçin</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}{customer.companyName ? ` - ${customer.companyName}` : ''}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={() => setShowCustomerModal(true)}>
                Tez müştəri yarat
              </Button>
            </div>
          </Field>

          <Field label="Menecer" error={formErrors.managerId}>
            <select
              value={form.managerId}
              onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Menecer seçin</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <Input value="Sifariş" readOnly />
          </Field>

          <Field label="Tarix" error={formErrors.date}>
            <Input
              type="date"
              value={form.date ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </Field>

          <Field label="Təhvil tarixi" error={formErrors.deadlineAt}>
            <Input
              type="date"
              value={form.deadlineAt ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, deadlineAt: event.target.value }))}
            />
          </Field>

          <Field label="Çap rəngi">
            <select
              value={item?.printColorText ?? '4+0'}
              onChange={(event) => updateItem({ printColorText: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {printColorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Məhsulun adı" error={formErrors.productName} className="xl:col-span-2">
            <Input value={item?.name ?? ''} onChange={(event) => updateItem({ name: event.target.value })} placeholder="Məsələn: Vizit kartı" />
          </Field>

          <Field label="Say" error={formErrors.quantity}>
            <Input
              type="number"
              min={1}
              value={item?.quantity ?? 1}
              onChange={(event) => updateItem({ quantity: Number(event.target.value) })}
            />
          </Field>

          <Field label="Ölçü / format">
            <Input
              value={item?.formatText ?? ''}
              onChange={(event) => updateItem({ formatText: event.target.value })}
              placeholder="A4, A5, 90x50, 30x40"
            />
          </Field>

          <Field label="Qeyd" className="xl:col-span-3">
            <textarea
              value={form.comment ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="Sifarişlə bağlı qısa qeyd"
            />
          </Field>
        </div>
      </Card>

      <Modal
        open={showCustomerModal}
        title="Tez müştəri yarat"
        description="Sifarişdən çıxmadan yeni müştəri əlavə edin."
        onClose={() => setShowCustomerModal(false)}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createCustomer}>
          <Field label="Ad">
            <Input value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} required />
          </Field>
          <Field label="Şirkət adı">
            <Input value={customerForm.companyName ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, companyName: event.target.value }))} />
          </Field>
          <Field label="Telefon">
            <Input value={customerForm.phone ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={customerForm.email ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} />
          </Field>
          <Field label="Qeyd" className="md:col-span-2">
            <Input value={customerForm.notes ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          <Field label="Sorğu / müraciət qeydi" className="md:col-span-2">
            <Input value={customerForm.inquiryNote ?? ''} onChange={(event) => setCustomerForm((current) => ({ ...current, inquiryNote: event.target.value }))} />
          </Field>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCustomerModal(false)}>
              Bağla
            </Button>
            <Button type="submit" disabled={customerSaving}>
              {customerSaving ? 'Yaradılır...' : 'Müştərini yarat'}
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
