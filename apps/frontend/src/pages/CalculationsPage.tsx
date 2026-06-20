import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CALCULATION_TEMPLATES,
  CalculationFormValues,
  CalculationListQuery,
  CalculationRecord,
  CustomerListItem,
  defaultCalculationValues,
  type CalculationConvertResult
} from '@bestapp/shared';
import { Button, Card } from '@bestapp/ui';
import { calculationsClient } from '../shared/api/calculations';
import { customersClient } from '../shared/api/customers';
import { ConfirmDialog, DataTable, EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination, SearchInput, StatusBadge } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';
import { CalculationEditorForm, mapCalculationToForm } from './CalculationEditorForm';

type QueryState = CalculationListQuery & {
  customerId: string;
  status: string;
};

function mapFormToDto(form: CalculationFormValues) {
  return {
    templateKey: form.templateKey,
    customerId: form.customerId,
    productName: form.productName,
    quantity: form.quantity,
    readySize: form.readySize || undefined,
    sheetFormat: form.sheetFormat,
    sheetFormatCustom: form.sheetFormatCustom || undefined,
    sheetPlacementCount: form.sheetPlacementCount,
    a1ConversionFactor: form.a1ConversionFactor,
    paperType: form.paperType || undefined,
    paperGram: form.paperGram || undefined,
    paperPurchasePrice: form.paperPurchasePrice,
    color: form.color,
    printSide: form.printSide,
    prilotka: form.prilotka,
    formCount: form.formCount,
    formPrice: form.formPrice,
    printPricingMode: form.printPricingMode,
    printCount: form.printCount,
    printUnitPrice: form.printUnitPrice,
    printFixedPrice: form.printFixedPrice,
    extraCosts: form.extraCosts.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: item.total,
      note: item.note || undefined
    })),
    catalog: {
      ...form.catalog
    },
    salePrice: form.salePrice,
    note: form.note || undefined,
    status: form.status
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
  const [rows, setRows] = useState<CalculationRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
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
  const [activeCalculation, setActiveCalculation] = useState<CalculationRecord | null>(null);
  const [form, setForm] = useState<CalculationFormValues>(defaultCalculationValues());
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

      const [calculationResponse, customersResponse] = await Promise.all([
        calculationsClient.list(apiQuery),
        customersClient.list({ page: 1, limit: 200 })
      ]);

      setRows(calculationResponse.data);
      setMeta(calculationResponse.meta);
      setCustomers(customersResponse.data);
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
    setForm(defaultCalculationValues('certificate_sheet'));
    setEditorOpen(true);
  };

  const openEdit = (calculation: CalculationRecord) => {
    setActiveCalculation(calculation);
    setForm(mapCalculationToForm(calculation));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActiveCalculation(null);
    setForm(defaultCalculationValues('certificate_sheet'));
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
      closeEditor();
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
      } else {
        await calculationsClient.update(calculationId, mapFormToDto(form));
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
        <PageHeader title="Hesablamalar" description="Çevik print hesablama modulu." />
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
        description="Print işi parametrlərini daxil edin, sistem kağız, çap və əlavə işləri avtomatik hesablasın."
        actions={<Button onClick={openCreate}>Yeni hesablama</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={query.search ?? ''} onChange={(value) => updateQuery({ search: value, page: 1 })} placeholder="Nömrə, məhsul və ya müştəri üzrə axtar" />
        </div>

        <div className="w-full lg:w-48">
          <select
            value={query.status ?? ''}
            onChange={(event) => updateQuery({ status: event.target.value as QueryState['status'], page: 1 })}
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
            key: 'template',
            header: 'Şablon',
            render: (row) => CALCULATION_TEMPLATES.find((template) => template.key === row.templateKey)?.label ?? row.templateKey
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
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge kind="calculation" status={row.status} />
          },
          {
            key: 'sale',
            header: 'Satış',
            render: (row) => formatCurrency(row.summary.salePrice)
          },
          {
            key: 'cost',
            header: 'Maya',
            render: (row) => formatCurrency(row.summary.costPrice)
          },
          {
            key: 'profit',
            header: 'Qazanc',
            render: (row) => formatCurrency(row.summary.profit)
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
            description="İlk print hesablamanı yaradın."
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
        description="Şablonu seçin, parametrləri doldurun və nəticəni avtomatik görün."
        onClose={closeEditor}
        widthClassName="max-w-6xl"
      >
        <CalculationEditorForm
          value={form}
          customers={customers}
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
        description="Bu hesablamadan order yaradılacaq. Sonradan hesablamanı dəyişsəniz, order avtomatik yenilənməyəcək."
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
