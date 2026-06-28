import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input } from '@bestapp/ui';
import { calculationParametersClient } from '../shared/api/calculation-parameters';
import { ConfirmDialog, DataTable, EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination, SearchInput } from '../shared/components';
import { formatCurrency } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';
import type { ReactNode } from 'react';

type CalculationParameterCategory = 'paper' | 'printing' | 'form' | 'lamination' | 'cutting' | 'creasing' | 'folding' | 'thermal_glue' | 'stapling' | 'punching' | 'manual_work' | 'packaging' | 'other_cost';

type CalculationParameterCreateDto = {
  category: CalculationParameterCategory;
  name: string;
  variants: string[];
  unit: string;
  price: number;
  isActive?: boolean;
  note?: string;
};

type CalculationParameterListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: CalculationParameterCategory | '';
  isActive?: boolean | '';
};

type CalculationParameterItem = {
  id: string;
  category: CalculationParameterCategory;
  name: string;
  variants: Array<{ label: string; value: string }>;
  unit: string;
  price: number;
  isActive: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ParameterFormState = CalculationParameterCreateDto;

const CALCULATION_PARAMETER_CATEGORIES: Array<{ value: CalculationParameterCategory; label: string }> = [
  { value: 'paper', label: 'Kağız' },
  { value: 'printing', label: 'Çap' },
  { value: 'form', label: 'Forma' },
  { value: 'lamination', label: 'Laminasiya' },
  { value: 'cutting', label: 'Kəsim' },
  { value: 'creasing', label: 'Beqovka' },
  { value: 'folding', label: 'Qatlama' },
  { value: 'thermal_glue', label: 'Termokley' },
  { value: 'stapling', label: 'Tikiş / Stepler' },
  { value: 'punching', label: 'Deşmə' },
  { value: 'manual_work', label: 'Əl işi' },
  { value: 'packaging', label: 'Qablaşdırma' },
  { value: 'other_cost', label: 'Digər xərc' }
];

function calculationParameterCategoryLabel(category: CalculationParameterCategory) {
  return CALCULATION_PARAMETER_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

function calculationParameterCategoryOptions() {
  return CALCULATION_PARAMETER_CATEGORIES;
}

function createParameterForm(category = 'paper' as CalculationParameterCreateDto['category']): ParameterFormState {
  return {
    category,
    name: '',
    variants: [],
    unit: '',
    price: 0,
    isActive: true,
    note: ''
  };
}

function variantsToText(variants: string[]) {
  return variants.join('\n');
}

function textToVariants(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type QueryState = CalculationParameterListQuery & {
  category: string;
  isActive: string;
};

function nextPageFromPatch(current: QueryState, patch: Partial<QueryState>) {
  return {
    ...current,
    ...patch,
    page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : current.page)
  };
}

export function CalculationParametersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<CalculationParameterItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<QueryState>({
    page: 1,
    limit: 10,
    search: '',
    category: '',
    isActive: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<CalculationParameterItem | null>(null);
  const [form, setForm] = useState<ParameterFormState>(createParameterForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalculationParameterItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const response = await calculationParametersClient.list({
        page: nextQuery.page,
        limit: nextQuery.limit,
        search: nextQuery.search || undefined,
        category: nextQuery.category ? (nextQuery.category as CalculationParameterCreateDto['category']) : undefined,
        isActive: nextQuery.isActive === '' ? undefined : nextQuery.isActive === 'true'
      });

      setRows(response.data);
      setMeta(response.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Parametrlər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.search, query.category, query.isActive]);

  const categoryOptions = useMemo(() => calculationParameterCategoryOptions(), []);

  const updateQuery = (patch: Partial<QueryState>) => {
    setQuery((current) => nextPageFromPatch(current, patch));
  };

  const openCreate = () => {
    setActiveRow(null);
    setForm(createParameterForm());
    setEditorOpen(true);
  };

  const openEdit = (row: CalculationParameterItem) => {
    setActiveRow(row);
    setForm({
      category: row.category,
      name: row.name,
      variants: row.variants.map((variant) => variant.value),
      unit: row.unit,
      price: row.price,
      isActive: row.isActive,
      note: row.note ?? ''
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setActiveRow(null);
    setForm(createParameterForm());
  };

  const saveParameter = async () => {
    setSaving(true);
    try {
      const payload: CalculationParameterCreateDto = {
        ...form,
        variants: form.variants.map((variant) => variant.trim()).filter(Boolean)
      };

      if (activeRow) {
        await calculationParametersClient.update(activeRow.id, payload);
        toast.success('Parametr yeniləndi', form.name);
      } else {
        await calculationParametersClient.create(payload);
        toast.success('Parametr yaradıldı', form.name);
      }

      closeEditor();
      await load(query);
    } catch (saveError) {
      toast.error('Parametr saxlanmadı', saveError instanceof Error ? saveError.message : 'Bir az sonra yenidən yoxlayın');
    } finally {
      setSaving(false);
    }
  };

  const removeParameter = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await calculationParametersClient.remove(deleteTarget.id);
      toast.success('Parametr silindi', deleteTarget.name);
      setDeleteTarget(null);
      await load(query);
    } catch (deleteError) {
      toast.error('Parametr silinmədi', deleteError instanceof Error ? deleteError.message : 'Bir az sonra yenidən yoxlayın');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Parametrlər" description="Print hesablamalarında istifadə olunan qiymət siyahısı." />
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
        title="Parametrlər"
        description="Kağız, çap, forma və əlavə işlər üçün qiymətləri burada idarə edin."
        actions={<Button onClick={openCreate}>Yeni parametr</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={query.search ?? ''} onChange={(value) => updateQuery({ search: value, page: 1 })} placeholder="Ad, qeyd və ya vahid üzrə axtar" />
        </div>

        <div className="w-full lg:w-52">
          <select
            value={query.category ?? ''}
            onChange={(event) => updateQuery({ category: event.target.value, page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün kateqoriyalar</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-44">
          <select
            value={query.isActive ?? ''}
            onChange={(event) => updateQuery({ isActive: event.target.value, page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Hamısı</option>
            <option value="true">Aktiv</option>
            <option value="false">Deaktiv</option>
          </select>
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          {
            key: 'category',
            header: 'Kateqoriya',
            render: (row) => calculationParameterCategoryLabel(row.category)
          },
          {
            key: 'name',
            header: 'Ad',
            render: (row) => row.name
          },
          {
            key: 'variants',
            header: 'Seçimlər / variantlar',
            render: (row) => (row.variants.length ? row.variants.map((variant) => variant.label).join(', ') : '—')
          },
          {
            key: 'unit',
            header: 'Ölçü vahidi',
            render: (row) => row.unit
          },
          {
            key: 'price',
            header: 'Qiymət',
            render: (row) => formatCurrency(row.price)
          },
          {
            key: 'state',
            header: 'Status',
            render: (row) => (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {row.isActive ? 'Aktiv' : 'Deaktiv'}
              </span>
            )
          },
          {
            key: 'note',
            header: 'Qeyd',
            render: (row) => row.note || '—'
          },
          {
            key: 'actions',
            header: 'Əməliyyatlar',
            className: 'w-[220px]',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Aç
                </Button>
                <Button variant="secondary" onClick={() => setDeleteTarget(row)}>
                  Sil
                </Button>
              </div>
            )
          }
        ]}
        emptyState={
          <EmptyState
            title="Parametr yoxdur"
            description="İlk kağız, çap və ya əlavə iş parametrini yaradın."
            actionLabel="Yeni parametr"
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
        title={activeRow ? 'Parametr redaktə et' : 'Yeni parametr'}
        description="Qiymətləri bir dəfə daxil edin, hesablamalarda avtomatik istifadə olunsun."
        onClose={closeEditor}
        widthClassName="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Kateqoriya">
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ParameterFormState['category'] }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ad">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>

            <Field label="Ölçü vahidi">
              <Input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
            </Field>

            <Field label="Qiymət">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: Math.max(Number(event.target.value || 0), 0) }))}
              />
            </Field>
          </div>

          <Field label="Seçimlər / variantlar">
            <textarea
              value={variantsToText(form.variants)}
              onChange={(event) => setForm((current) => ({ ...current, variants: textToVariants(event.target.value) }))}
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
              placeholder="Hər sətirdə bir variant yazın"
            />
          </Field>

          <Field label="Qeyd">
            <textarea
              value={form.note ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
              placeholder="İstəyə bağlı qeyd"
            />
          </Field>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive ?? true} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Aktiv
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeEditor}>
              Bağla
            </Button>
            <Button type="button" onClick={() => void saveParameter()} disabled={saving}>
              {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Parametri sil"
        description={deleteTarget ? `${deleteTarget.name} parametrini silmək istədiyinizə əminsiniz?` : ''}
        confirmLabel="Sil"
        cancelLabel="Bağla"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void removeParameter()}
      />
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
