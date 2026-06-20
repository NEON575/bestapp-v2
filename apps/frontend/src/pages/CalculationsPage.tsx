import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalculationStatus, type CalculationItem, type CalculationListItem, type CalculationListQueryDto, type CalculationSectionType, type CustomerListItem, type CreateCalculationDto, type UpdateCalculationDto } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { calculationsClient } from '../shared/api/calculations';
import { customersClient } from '../shared/api/customers';
import { ConfirmDialog, DataTable, EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination, SearchInput, StatusBadge } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type CalculationRowForm = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  note: string;
  paperName: string;
  format: string;
  gramaj: string;
  baseQuantity: number;
  fire: number;
  totalQuantity: number;
  price: number;
  printType: string;
  printSide: string;
  color: string;
  printCount: number;
  printPrice: number;
  formCount: number;
  formPrice: number;
  extraWorkType: string;
};

type CalculationSectionForm = {
  id: string;
  key: CalculationSectionType;
  title: string;
  rows: CalculationRowForm[];
};

type CalculationFormState = {
  id?: string;
  customerId: string;
  productName: string;
  quantity: number;
  note: string;
  status: CalculationStatus;
  salePrice: number;
  sections: CalculationSectionForm[];
};

type QueryState = CalculationListQueryDto & {
  customerId: string;
  status: string;
};

const sectionTemplates: Array<{ key: CalculationSectionType; title: string }> = [
  { key: 'paper', title: 'Kağız / Materiallar' },
  { key: 'printing', title: 'Çap' },
  { key: 'form', title: 'Forma' },
  { key: 'extra_work', title: 'Əlavə işlər' },
  { key: 'other_costs', title: 'Digər xərclər' }
];

const extraWorkOptions = ['Laminasiya', 'Kəsim', 'Beqovka', 'Qatlama', 'Termokley', 'Tikiş / Stepler', 'Deşmə', 'Əl işi', 'Qablaşdırma', 'Digər'];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRow(sectionKey: CalculationSectionType): CalculationRowForm {
  return {
    id: uid(),
    name: '',
    quantity: 1,
    unit: sectionKey === 'paper' ? 'ədəd' : sectionKey === 'printing' ? 'çap' : sectionKey === 'form' ? 'forma' : 'ədəd',
    unitPrice: 0,
    note: '',
    paperName: '',
    format: '',
    gramaj: '',
    baseQuantity: 1,
    fire: 0,
    totalQuantity: 1,
    price: 0,
    printType: '',
    printSide: '',
    color: '',
    printCount: 1,
    printPrice: 0,
    formCount: 1,
    formPrice: 0,
    extraWorkType: ''
  };
}

function createEmptyForm(): CalculationFormState {
  return {
    customerId: '',
    productName: '',
    quantity: 1,
    note: '',
    status: CalculationStatus.DRAFT,
    salePrice: 0,
    sections: sectionTemplates.map((section) => ({
      id: uid(),
      key: section.key,
      title: section.title,
      rows: [createEmptyRow(section.key)]
    }))
  };
}

function toNumber(value: string | number | null | undefined) {
  if (value == null || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateRowTotal(sectionKey: CalculationSectionType, row: CalculationRowForm) {
  if (sectionKey === 'paper') {
    const totalQuantity = row.totalQuantity > 0 ? row.totalQuantity : roundMoney(row.baseQuantity * (1 + row.fire / 100));
    return roundMoney(totalQuantity * row.price);
  }

  if (sectionKey === 'printing') {
    return roundMoney(row.printCount * row.printPrice);
  }

  if (sectionKey === 'form') {
    return roundMoney(row.formCount * row.formPrice);
  }

  return roundMoney(row.quantity * row.unitPrice);
}

function calculateSectionTotal(section: CalculationSectionForm) {
  return roundMoney(section.rows.reduce((sum, row) => sum + calculateRowTotal(section.key, row), 0));
}

function mapCalculationToForm(calculation: CalculationItem): CalculationFormState {
  const sourceSections = calculation.sections?.length ? calculation.sections : sectionTemplates.map((section) => ({
    id: uid(),
    key: section.key,
    title: section.title,
    total: 0,
    rows: []
  }));

  const sections = sectionTemplates.map((template) => {
    const matched = sourceSections.find((section) => section.key === template.key);
    return {
      id: matched?.id ?? uid(),
      key: template.key,
      title: matched?.title ?? template.title,
      rows: (matched?.rows ?? []).map((row) => ({
        id: row.id,
        name: row.name ?? '',
        quantity: row.quantity ?? 1,
        unit: row.unit ?? '',
        unitPrice: row.unitPrice ?? 0,
        note: row.note ?? '',
        paperName: row.paperName ?? '',
        format: row.format ?? '',
        gramaj: row.gramaj ?? '',
        baseQuantity: row.baseQuantity ?? row.quantity ?? 1,
        fire: row.fire ?? 0,
        totalQuantity: row.totalQuantity ?? row.quantity ?? 1,
        price: row.price ?? row.unitPrice ?? 0,
        printType: row.printType ?? '',
        printSide: row.printSide ?? '',
        color: row.color ?? '',
        printCount: row.printCount ?? row.quantity ?? 1,
        printPrice: row.printPrice ?? row.unitPrice ?? 0,
        formCount: row.formCount ?? row.quantity ?? 1,
        formPrice: row.formPrice ?? row.unitPrice ?? 0,
        extraWorkType: row.extraWorkType ?? ''
      }))
    };
  });

  return {
    id: calculation.id,
    customerId: calculation.customerId,
    productName: calculation.productName,
    quantity: calculation.quantity,
    note: calculation.note ?? '',
    status: calculation.status as CalculationStatus,
    salePrice: calculation.salePrice,
    sections
  };
}

function toPayload(form: CalculationFormState): CreateCalculationDto | UpdateCalculationDto {
  return {
    customerId: form.customerId,
    productName: form.productName,
    quantity: form.quantity,
    note: form.note || undefined,
    status: form.status,
    salePrice: form.salePrice,
    sections: form.sections.map((section) => ({
      id: section.id,
      key: section.key,
      title: section.title,
      total: calculateSectionTotal(section),
      rows: section.rows.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: row.unitPrice,
        total: calculateRowTotal(section.key, row),
        note: row.note || undefined,
        paperName: row.paperName || undefined,
        format: row.format || undefined,
        gramaj: row.gramaj || undefined,
        baseQuantity: row.baseQuantity,
        fire: row.fire,
        totalQuantity: row.totalQuantity,
        price: row.price,
        printType: row.printType || undefined,
        printSide: row.printSide || undefined,
        color: row.color || undefined,
        printCount: row.printCount,
        printPrice: row.printPrice,
        formCount: row.formCount,
        formPrice: row.formPrice,
        extraWorkType: row.extraWorkType || undefined
      }))
    }))
  };
}

function cloneForm(form: CalculationFormState): CalculationFormState {
  return {
    ...form,
    sections: form.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({ ...row }))
    }))
  };
}

function updateRow(
  form: CalculationFormState,
  sectionId: string,
  rowId: string,
  patch: Partial<CalculationRowForm>
): CalculationFormState {
  return {
    ...form,
    sections: form.sections.map((section) =>
      section.id !== sectionId
        ? section
        : {
            ...section,
            rows: section.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
          }
    )
  };
}

function SectionEditor({
  section,
  onAddRow,
  onRemoveRow,
  onUpdateRow
}: {
  section: CalculationSectionForm;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onUpdateRow: (rowId: string, patch: Partial<CalculationRowForm>) => void;
}) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
          <p className="mt-1 text-xs text-slate-500">Bu bölmədə istədiyiniz qədər sətir əlavə edə bilərsiniz.</p>
        </div>
        <Button type="button" variant="secondary" onClick={onAddRow}>
          {section.key === 'paper' ? 'Kağız əlavə et' : section.key === 'printing' ? 'Çap əlavə et' : section.key === 'form' ? 'Forma əlavə et' : section.key === 'extra_work' ? 'Əlavə iş əlavə et' : 'Sətir əlavə et'}
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {section.rows.map((row, index) => {
          const rowTotal = calculateRowTotal(section.key, row);

          return (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-700">
                  Sətir {index + 1}
                </div>
                <Button type="button" variant="secondary" onClick={() => onRemoveRow(row.id)}>
                  Sil
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Ad">
                  <Input value={row.name} onChange={(event) => onUpdateRow(row.id, { name: event.target.value })} />
                </Field>

                <Field label="Say / Miqdar">
                  <Input type="number" min={0} value={row.quantity} onChange={(event) => onUpdateRow(row.id, { quantity: toNumber(event.target.value) })} />
                </Field>

                <Field label="Ölçü vahidi">
                  <Input value={row.unit} onChange={(event) => onUpdateRow(row.id, { unit: event.target.value })} />
                </Field>

                <Field label="Ədəd qiyməti">
                  <Input type="number" min={0} value={row.unitPrice} onChange={(event) => onUpdateRow(row.id, { unitPrice: toNumber(event.target.value) })} />
                </Field>

                <Field label="Cəmi">
                  <Input value={formatCurrency(rowTotal)} readOnly />
                </Field>

                <Field label="Qeyd">
                  <Input value={row.note} onChange={(event) => onUpdateRow(row.id, { note: event.target.value })} />
                </Field>

                {section.key === 'paper' ? (
                  <>
                    <Field label="Kağız adı">
                      <Input value={row.paperName} onChange={(event) => onUpdateRow(row.id, { paperName: event.target.value })} />
                    </Field>
                    <Field label="Format">
                      <Input value={row.format} onChange={(event) => onUpdateRow(row.id, { format: event.target.value })} />
                    </Field>
                    <Field label="Qramaj">
                      <Input value={row.gramaj} onChange={(event) => onUpdateRow(row.id, { gramaj: event.target.value })} />
                    </Field>
                    <Field label="Əsas miqdar">
                      <Input type="number" min={0} value={row.baseQuantity} onChange={(event) => onUpdateRow(row.id, { baseQuantity: toNumber(event.target.value) })} />
                    </Field>
                    <Field label="Fire / prilotka">
                      <Input type="number" min={0} value={row.fire} onChange={(event) => onUpdateRow(row.id, { fire: toNumber(event.target.value) })} />
                    </Field>
                    <Field label="Ümumi miqdar">
                      <Input type="number" min={0} value={row.totalQuantity} onChange={(event) => onUpdateRow(row.id, { totalQuantity: toNumber(event.target.value) })} />
                    </Field>
                    <Field label="Qiymət">
                      <Input type="number" min={0} value={row.price} onChange={(event) => onUpdateRow(row.id, { price: toNumber(event.target.value), unitPrice: toNumber(event.target.value) })} />
                    </Field>
                  </>
                ) : null}

                {section.key === 'printing' ? (
                  <>
                    <Field label="Çap növü">
                      <Input value={row.printType} onChange={(event) => onUpdateRow(row.id, { printType: event.target.value })} />
                    </Field>
                    <Field label="Birüzlü / İkiüzlü">
                      <Input value={row.printSide} onChange={(event) => onUpdateRow(row.id, { printSide: event.target.value })} />
                    </Field>
                    <Field label="Rəng">
                      <Input value={row.color} onChange={(event) => onUpdateRow(row.id, { color: event.target.value })} />
                    </Field>
                    <Field label="Çap sayı">
                      <Input type="number" min={0} value={row.printCount} onChange={(event) => onUpdateRow(row.id, { printCount: toNumber(event.target.value), quantity: toNumber(event.target.value) })} />
                    </Field>
                    <Field label="Çap qiyməti">
                      <Input type="number" min={0} value={row.printPrice} onChange={(event) => onUpdateRow(row.id, { printPrice: toNumber(event.target.value), unitPrice: toNumber(event.target.value) })} />
                    </Field>
                  </>
                ) : null}

                {section.key === 'form' ? (
                  <>
                    <Field label="Forma sayı">
                      <Input type="number" min={0} value={row.formCount} onChange={(event) => onUpdateRow(row.id, { formCount: toNumber(event.target.value), quantity: toNumber(event.target.value) })} />
                    </Field>
                    <Field label="Forma qiyməti">
                      <Input type="number" min={0} value={row.formPrice} onChange={(event) => onUpdateRow(row.id, { formPrice: toNumber(event.target.value), unitPrice: toNumber(event.target.value) })} />
                    </Field>
                  </>
                ) : null}

                {section.key === 'extra_work' ? (
                  <>
                    <Field label="Əlavə iş növü">
                      <select
                        value={row.extraWorkType}
                        onChange={(event) => onUpdateRow(row.id, { extraWorkType: event.target.value, name: event.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Seçin</option>
                        {extraWorkOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CalculationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<CalculationListItem[]>([]);
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
  const [activeCalculation, setActiveCalculation] = useState<CalculationItem | null>(null);
  const [form, setForm] = useState<CalculationFormState>(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmConvertOpen, setConfirmConvertOpen] = useState(false);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const apiQuery: CalculationListQueryDto = {
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
    setQuery((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : current.page)
    }));
  };

  const openCreate = () => {
    setActiveCalculation(null);
    setForm(createEmptyForm());
    setEditorOpen(true);
  };

  const openEdit = (calculation: CalculationItem) => {
    setActiveCalculation(calculation);
    setForm(mapCalculationToForm(calculation));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActiveCalculation(null);
    setForm(createEmptyForm());
  };

  const persist = async () => {
    const payload = toPayload(form);

    if (form.id) {
      return calculationsClient.update(form.id, payload as UpdateCalculationDto);
    }

    return calculationsClient.create(payload as CreateCalculationDto);
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
      let calculationId = form.id;

      if (!calculationId) {
        const saved = await persist();
        if (!saved) return;
        calculationId = saved.id;
      } else {
        await calculationsClient.update(calculationId, toPayload(form));
      }

      const result = await calculationsClient.convertToOrder(calculationId);
      toast.success('Sifariş yaradıldı', result.order.number);
      closeEditor();
      await load(query);
    } catch (convertError) {
      toast.error('Sifarişə çevrilmədi', convertError instanceof Error ? convertError.message : 'Bir az sonra yenidən yoxlayın');
    } finally {
      setConverting(false);
    }
  };

  const sectionTotals = useMemo(
    () =>
      form.sections.map((section) => ({
        ...section,
        total: calculateSectionTotal(section)
      })),
    [form.sections]
  );

  const costPrice = useMemo(() => sectionTotals.reduce((sum, section) => sum + section.total, 0), [sectionTotals]);
  const profit = useMemo(() => roundMoney(form.salePrice - costPrice), [form.salePrice, costPrice]);
  const saleUnitPrice = useMemo(() => (form.quantity > 0 ? roundMoney(form.salePrice / form.quantity) : 0), [form.salePrice, form.quantity]);
  const activeConverted = Boolean(activeCalculation?.orderId);

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Hesablamalar" description="Məhsul axını dəyişdikcə də yenilənən çevik hesablamalar." />
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
        description="Kağız, çap, forma və əlavə işləri istənilən vaxt dəyişə biləcəyiniz çevik hesablama modulu."
        actions={
          <Button onClick={openCreate}>
            Yeni hesablama
          </Button>
        }
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={query.search ?? ''} onChange={(value) => updateQuery({ search: value, page: 1 })} placeholder="Nömrə, məhsul və ya müştəri üzrə axtar" />
        </div>

        <div className="w-full lg:w-48">
          <select
            value={query.status ?? ''}
            onChange={(event) => updateQuery({ status: event.target.value as CalculationStatus | '', page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün statuslar</option>
            <option value={CalculationStatus.DRAFT}>Qaralama</option>
            <option value={CalculationStatus.APPROVED}>Təsdiqləndi</option>
            <option value={CalculationStatus.CONVERTED}>Sifarişə çevrildi</option>
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
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge kind="calculation" status={row.status} />
          },
          {
            key: 'sale',
            header: 'Satış qiyməti',
            render: (row) => formatCurrency(row.salePrice)
          },
          {
            key: 'cost',
            header: 'Maya dəyəri',
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
            description="İlk çevik hesablamanı yaradın və satışı daha sonra formaya uyğun dəyişin."
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
        description="Sətirləri istədiyiniz anda əlavə edin, dəyişin və silin. Hesablamanın strukturu çevik qalır."
        onClose={closeEditor}
        widthClassName="max-w-6xl"
      >
        <div className="space-y-5">
          {activeConverted ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Bu hesablama artıq sifarişə çevrilib. Dəyişiklik sifarişin maya dəyərinə təsir edə bilər.
            </div>
          ) : null}

          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Müştəri">
                <select
                  value={form.customerId}
                  onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Müştəri seçin</option>
                  {customerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Məhsulun adı">
                <Input value={form.productName} onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))} />
              </Field>

              <Field label="Tiraj / Say">
                <Input type="number" min={0} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: toNumber(event.target.value) }))} />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CalculationStatus }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value={CalculationStatus.DRAFT}>Qaralama</option>
                  <option value={CalculationStatus.APPROVED}>Təsdiqləndi</option>
                  <option value={CalculationStatus.CONVERTED}>Sifarişə çevrildi</option>
                </select>
              </Field>

              <Field label="Satış qiyməti">
                <Input type="number" min={0} value={form.salePrice} onChange={(event) => setForm((current) => ({ ...current, salePrice: toNumber(event.target.value) }))} />
              </Field>

              <Field label="Ədəd satış qiyməti">
                <Input value={formatCurrency(saleUnitPrice)} readOnly />
              </Field>

              <Field label="Maya dəyəri">
                <Input value={formatCurrency(costPrice)} readOnly />
              </Field>

              <Field label="Qazanc">
                <Input value={formatCurrency(profit)} readOnly />
              </Field>

              <Field label="Qeyd" className="xl:col-span-3">
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                  placeholder="Hesablama qeydləri"
                />
              </Field>
            </div>
          </Card>

          {sectionTotals.map((section) => (
            <SectionEditor
              key={section.id}
              section={section}
              onAddRow={() =>
                setForm((current) => ({
                  ...current,
                  sections: current.sections.map((item) =>
                    item.id === section.id ? { ...item, rows: [...item.rows, createEmptyRow(item.key)] } : item
                  )
                }))
              }
              onRemoveRow={(rowId) =>
                setForm((current) => ({
                  ...current,
                  sections: current.sections.map((item) =>
                    item.id === section.id
                      ? {
                          ...item,
                          rows: item.rows.filter((row) => row.id !== rowId)
                        }
                      : item
                  )
                }))
              }
              onUpdateRow={(rowId, patch) => setForm((current) => updateRow(current, section.id, rowId, patch))}
            />
          ))}

          <div className="flex flex-wrap justify-between gap-3">
            <div className="text-sm text-slate-500">
              Seçilmiş sahələr saxlandıqdan sonra da düzəliş edilə bilər.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={closeEditor}>
                Bağla
              </Button>
              <Button type="button" variant="secondary" onClick={() => void saveCalculation()} disabled={saving || converting}>
                {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
              </Button>
              <Button type="button" onClick={() => setConfirmConvertOpen(true)} disabled={saving || converting || activeConverted}>
                {converting ? 'Çevrilir...' : activeConverted ? 'Sifarişə çevrilib' : 'Sifarişə çevir'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmConvertOpen}
        title="Sifarişə çevir"
        description="Bu hesablamadan order yaradılacaq. Sonradan hesablamanı dəyişsəniz də order avtomatik yenilənməyəcək."
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
