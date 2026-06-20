import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CalculationConvertResult, CalculationCreateDto, CalculationListItem, CalculationListQuery, CalculationParameterItem, CustomerListItem } from '@bestapp/shared';
import { Button, Card } from '@bestapp/ui';
import { calculationParametersClient } from '../shared/api/calculation-parameters';
import { calculationsClient } from '../shared/api/calculations';
import { customersClient } from '../shared/api/customers';
import { ConfirmDialog, DataTable, EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination, SearchInput, StatusBadge } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';
import { CalculationEditorForm, createCalculationForm, mapCalculationToForm, type CalculationFormState } from './CalculationEditorForm';

type QueryState = CalculationListQuery & {
  customerId: string;
  status: string;
};

function mapFormToDto(form: CalculationFormState): CalculationCreateDto {
  return {
    ...form,
    rows: form.rows.map((row) => ({
      ...row,
      variants: row.variants.map((variant) => ({ ...variant }))
    }))
  };
}

function nextPageFromPatch(current: QueryState, patch: Partial<QueryState>) {
  return {
    ...current,
    ...patch,
    page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : current.page)
  };
}

export function CalculationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<CalculationListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [parameters, setParameters] = useState<CalculationParameterItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<QueryState>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: '',
    customerId: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeCalculation, setActiveCalculation] = useState<CalculationListItem | null>(null);
  const [form, setForm] = useState<CalculationFormState>(createCalculationForm());
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmConvertOpen, setConfirmConvertOpen] = useState(false);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const apiQuery: CalculationListQuery = {
        ...nextQuery,
        status: nextQuery.status || undefined,
        customerId: nextQuery.customerId || undefined
      };

      const [calculationResponse, customersResponse, parametersResponse] = await Promise.all([
        calculationsClient.list(apiQuery),
        customersClient.list({ page: 1, limit: 200 }),
        calculationParametersClient.list({ page: 1, limit: 500, isActive: true })
      ]);

      setRows(calculationResponse.data);
      setMeta(calculationResponse.meta);
      setCustomers(customersResponse.data);
      setParameters(parametersResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Hesablamalar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.search, query.sortBy, query.sortOrder, query.status, query.customerId]);

  const customerOptions = useMemo(() => customers.map((customer) => ({ value: customer.id, label: customer.name })), [customers]);

  const updateQuery = (patch: Partial<QueryState>) => {
    setQuery((current) => nextPageFromPatch(current, patch));
  };

  const openCreate = () => {
    setActiveCalculation(null);
    setForm(createCalculationForm());
    setEditorOpen(true);
  };

  const openEdit = (calculation: CalculationListItem) => {
    setActiveCalculation(calculation);
    setForm(mapCalculationToForm(calculation));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActiveCalculation(null);
    setForm(createCalculationForm());
    setConfirmConvertOpen(false);
  };

  const persist = async () => {
    const payload = mapFormToDto(form);

    if (activeCalculation?.id) {
      return calculationsClient.update(activeCalculation.id, payload);
    }

    return calculationsClient.create(payload);
  };

  const saveCalculation = async () => {
    setSaving(true);
    try {
      const saved = await persist();
      toast.success('Hesablama saxlanıldı', saved.number);
      setActiveCalculation(saved);
      setForm(mapCalculationToForm(saved));
      await load(query);
      return saved;
    } catch (saveError) {
      toast.error('Hesablama saxlanmadı', saveError instanceof Error ? saveError.message : 'Bir az sonra yenidən yoxlayın');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const convertCalculation = async () => {
    setConverting(true);
    try {
      let calculationId = activeCalculation?.id;

      if (!calculationId) {
        const saved = await persist();
        if (!saved) return;
        calculationId = saved.id;
        setActiveCalculation(saved);
        setForm(mapCalculationToForm(saved));
      } else {
        const saved = await calculationsClient.update(calculationId, mapFormToDto(form));
        setActiveCalculation(saved);
        setForm(mapCalculationToForm(saved));
      }

      const result: CalculationConvertResult = await calculationsClient.convertToOrder(calculationId);
      toast.success('Sifariş yaradıldı', result.order.number);
      closeEditor();
      await load(query);
    } catch (convertError) {
      toast.error('Sifarişə çevrilmədi', convertError instanceof Error ? convertError.message : 'Bir az sonra yenidən yoxlayın');
    } finally {
      setConverting(false);
    }
  };

  const activeConverted = Boolean(activeCalculation?.orderId);

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Hesablamalar" description="Parametr əsaslı print hesablama modulu." />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hesablamalar"
        description="Parametrləri seçin, qiymətlər avtomatik hesablansın və lazım olduqda sifarişə çevirin."
        actions={<Button onClick={openCreate}>Yeni hesablama</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={query.search ?? ''} onChange={(value) => updateQuery({ search: value, page: 1 })} placeholder="Nömrə, məhsul və ya müştəri üzrə axtar" />
        </div>

        <div className="w-full lg:w-44">
          <select
            value={query.status ?? ''}
            onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün statuslar</option>
            <option value="draft">Qaralama</option>
            <option value="approved">Təsdiqləndi</option>
            <option value="converted">Sifarişə çevrildi</option>
          </select>
        </div>

        <div className="w-full lg:w-56">
          <select
            value={query.customerId ?? ''}
            onChange={(event) => updateQuery({ customerId: event.target.value, page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün müştərilər</option>
            {customerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          {
            key: 'number',
            header: 'Nömrə',
            render: (row) => (
              <div>
                <div className="font-semibold text-slate-950">{row.number}</div>
                <div className="text-xs text-slate-500">{formatDateOnly(row.createdAt)}</div>
              </div>
            )
          },
          {
            key: 'customer',
            header: 'Müştəri',
            render: (row) => row.customer?.name ?? '—'
          },
          {
            key: 'product',
            header: 'Məhsul',
            render: (row) => row.productName
          },
          {
            key: 'quantity',
            header: 'Tiraj',
            render: (row) => formatNumber(row.quantity, 0)
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge kind="calculation" status={row.status} />
          },
          {
            key: 'sale',
            header: 'Satış',
            render: (row) => formatCurrency(row.salePrice)
          },
          {
            key: 'cost',
            header: 'Maya',
            render: (row) => formatCurrency(row.costPrice)
          },
          {
            key: 'profit',
            header: 'Qazanc',
            render: (row) => formatCurrency(row.profit)
          },
          {
            key: 'order',
            header: 'Sifariş',
            render: (row) =>
              row.order ? (
                <button type="button" className="font-semibold text-sky-700 hover:underline" onClick={() => navigate(`/orders/${row.order?.id}`)}>
                  {row.order.number}
                </button>
              ) : (
                '—'
              )
          },
          {
            key: 'actions',
            header: 'Əməliyyatlar',
            className: 'w-[240px]',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Aç
                </Button>
                {row.orderId ? (
                  <Button variant="secondary" onClick={() => navigate(`/orders/${row.orderId}`)}>
                    Sifarişi aç
                  </Button>
                ) : null}
              </div>
            )
          }
        ]}
        emptyState={
          <EmptyState
            title="Hesablama yoxdur"
            description="İlk parametrlərə əsaslanan hesablamanı yaradın."
            actionLabel="Yeni hesablama"
            onAction={openCreate}
          />
        }
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />

      <Card className="border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Cəmi: <span className="font-semibold text-slate-950">{meta.total}</span>
      </Card>

      <Modal
        open={editorOpen}
        title={activeCalculation ? `Hesablama ${activeCalculation.number}` : 'Yeni hesablama'}
        description="Kateqoriya seçin, parametrlər avtomatik qiymətlənsin və nəticəni saxlayın."
        onClose={closeEditor}
        widthClassName="max-w-7xl"
      >
        <CalculationEditorForm
          value={form}
          customers={customers}
          parameters={parameters}
          onChange={setForm}
          onClose={closeEditor}
          onSave={() => void saveCalculation()}
          onConvert={() => setConfirmConvertOpen(true)}
          saving={saving}
          converting={converting}
          converted={activeConverted}
        />
      </Modal>

      <ConfirmDialog
        open={confirmConvertOpen}
        title="Sifarişə çevir"
        description="Bu hesablama əsasında order yaradılacaq. Sonradan hesablama dəyişsə, order avtomatik yenilənməyəcək."
        confirmLabel="Davam et"
        cancelLabel="Bağla"
        loading={converting}
        onCancel={() => setConfirmConvertOpen(false)}
        onConfirm={() => {
          setConfirmConvertOpen(false);
          void convertCalculation();
        }}
      />
    </div>
  );
}
