import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
  CreateMaterialDto,
  InventoryMaterialItem,
  MaterialCategoryItem,
  MaterialDynamicField,
  MaterialQueryDto
} from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { settingsClient } from '../shared/api/settings';
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';

type MaterialDraft = {
  categoryId: string;
  name: string;
  unit: string;
  stockUnit: string;
  packageUnit: string;
  defaultUnitsPerPackage: string;
  gram: string;
  size: string;
  quantityInPack: string;
  vatIncluded: boolean;
  minStockLevel: string;
  notes: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
};

const emptyDraft: MaterialDraft = {
  categoryId: '',
  name: '',
  unit: 'ədəd',
  stockUnit: 'ədəd',
  packageUnit: '',
  defaultUnitsPerPackage: '',
  gram: '',
  size: '',
  quantityInPack: '',
  vatIncluded: false,
  minStockLevel: '',
  notes: '',
  isActive: true,
  metadata: {}
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDraft(row: InventoryMaterialItem): MaterialDraft {
  return {
    categoryId: row.category?.id ?? '',
    name: row.name,
    unit: row.unit,
    stockUnit: row.stockUnit ?? row.unit,
    packageUnit: row.packageUnit ?? '',
    defaultUnitsPerPackage: row.defaultUnitsPerPackage != null ? String(row.defaultUnitsPerPackage) : '',
    gram: row.gram != null ? String(row.gram) : '',
    size: row.size ?? '',
    quantityInPack: row.quantityInPack != null ? String(row.quantityInPack) : '',
    vatIncluded: Boolean(row.vatIncluded),
    minStockLevel: String(row.minStockLevel ?? ''),
    notes: row.notes ?? '',
    isActive: row.isActive ?? true,
    metadata: row.metadata ?? {}
  };
}

function toDto(draft: MaterialDraft): CreateMaterialDto {
  return {
    categoryId: draft.categoryId || undefined,
    name: draft.name.trim(),
    unit: draft.unit.trim() || 'ədəd',
    stockUnit: draft.stockUnit.trim() || draft.unit.trim() || 'ədəd',
    packageUnit: draft.packageUnit || undefined,
    defaultUnitsPerPackage: draft.defaultUnitsPerPackage ? toNumber(draft.defaultUnitsPerPackage) : undefined,
    gram: draft.gram ? toNumber(draft.gram) : undefined,
    size: draft.size || undefined,
    quantityInPack: draft.quantityInPack ? toNumber(draft.quantityInPack) : undefined,
    vatIncluded: draft.vatIncluded,
    minStockLevel: draft.minStockLevel ? toNumber(draft.minStockLevel) : undefined,
    notes: draft.notes || undefined,
    isActive: draft.isActive,
    metadata: draft.metadata
  };
}

export function MaterialsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<InventoryMaterialItem[]>([]);
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [units, setUnits] = useState<string[]>([]);
  const [query, setQuery] = useState<MaterialQueryDto>({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    categoryId: '',
    gram: undefined,
    size: '',
    lowStockOnly: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraftState, setCreateDraftState] = useState<MaterialDraft>(emptyDraft);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const [materialsResponse, categoriesResponse, unitResponse] = await Promise.all([
        inventoryClient.materials(nextQuery),
        inventoryClient.categories(),
        settingsClient.units()
      ]);

      setRows(materialsResponse.data);
      setMeta(materialsResponse.meta);
      setCategories(categoriesResponse);
      setUnits(unitResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Materiallar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.categoryId, query.gram, query.size, query.lowStockOnly]);

  const selectedCreateCategory = useMemo(
    () => categories.find((item) => item.id === createDraftState.categoryId) ?? null,
    [categories, createDraftState.categoryId]
  );

  const selectedEditCategory = useMemo(
    () => categories.find((item) => item.id === draft?.categoryId) ?? null,
    [categories, draft?.categoryId]
  );

  const saveCreate = async () => {
    if (!createDraftState.name.trim() || !createDraftState.categoryId) {
      toast.warning('Kateqoriya və material adı vacibdir');
      return;
    }

    setSaving(true);
    try {
      await inventoryClient.createMaterial(toDto(createDraftState));
      toast.success('Material yaradıldı');
      setCreateOpen(false);
      setCreateDraftState(emptyDraft);
      await load(query);
    } catch (saveError) {
      toast.error('Material yaradılmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!draft || !editingId) {
      return;
    }

    setSaving(true);
    try {
      await inventoryClient.updateMaterial(editingId, toDto(draft));
      toast.success('Material yeniləndi');
      setEditingId(null);
      setDraft(null);
      await load(query);
    } catch (saveError) {
      toast.error('Material yenilənmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !rows.length) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Materiallar"
        description="Kağız, karton, laminasiya, boya və digər istehsal materialları üçün ümumi baza."
        actions={<Button onClick={() => setCreateOpen(true)}>Yeni material</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-full lg:w-64">
          <Input
            value={query.search ?? ''}
            onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))}
            placeholder="Kod və ya material adı"
          />
        </div>
        <div className="w-full lg:w-52">
          <select
            value={query.categoryId ?? ''}
            onChange={(event) => setQuery((current) => ({ ...current, categoryId: event.target.value, page: 1 }))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Bütün kateqoriyalar</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full lg:w-32">
          <Input
            type="number"
            value={query.gram ?? ''}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                gram: event.target.value ? toNumber(event.target.value) : undefined,
                page: 1
              }))
            }
            placeholder="Qram"
          />
        </div>
        <div className="w-full lg:w-44">
          <Input
            value={query.size ?? ''}
            onChange={(event) => setQuery((current) => ({ ...current, size: event.target.value, page: 1 }))}
            placeholder="Razmer"
          />
        </div>
        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(query.lowStockOnly)}
            onChange={(event) => setQuery((current) => ({ ...current, lowStockOnly: event.target.checked, page: 1 }))}
          />
          Az qalan materiallar
        </label>
      </div>

      {!rows.length ? (
        <EmptyState title="Material tapılmadı" description="Filtrləri dəyişin və ya yeni material əlavə edin." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Kod', 'Məhsulun adı', 'Kateqoriya', 'Tip / parametr', 'Ölçü / razmer', 'Vahid', 'Qeyd', 'Status', 'Əməliyyat'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEditing = editingId === row.id && draft;
                  return isEditing ? (
                    <EditableMaterialRow
                      key={row.id}
                      draft={draft}
                      categories={categories}
                      units={units}
                      selectedCategory={selectedEditCategory}
                      saving={saving}
                      onChange={setDraft}
                      onCancel={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      onSave={() => void saveEdit()}
                    />
                  ) : (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-950">{row.sku ?? 'Avtomatik'}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.category?.name ?? '—'}</td>
                      <td className="px-4 py-3">{renderMetadataSummary(row)}</td>
                      <td className="px-4 py-3">{row.size ?? '—'}</td>
                      <td className="px-4 py-3">{row.unit}</td>
                      <td className="px-4 py-3">{row.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {row.isActive ? 'Aktiv' : 'Passiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => {
                            setEditingId(row.id);
                            setDraft(createDraft(row));
                          }}
                        >
                          Düzəliş
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />

      <Modal
        open={createOpen}
        title="Yeni material"
        description="Kod kateqoriyaya uyğun avtomatik yaradılacaq. Qiymət və təchizatçı Alış bölməsində idarə olunacaq."
        onClose={() => setCreateOpen(false)}
      >
        <div className="space-y-4">
          <EditableMaterialForm draft={createDraftState} categories={categories} units={units} selectedCategory={selectedCreateCategory} onChange={setCreateDraftState} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Bağla
            </Button>
            <Button type="button" onClick={() => void saveCreate()} disabled={saving}>
              {saving ? 'Yaradılır...' : 'Yadda saxla'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EditableMaterialRow({
  draft,
  categories,
  units,
  selectedCategory,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  draft: MaterialDraft;
  categories: MaterialCategoryItem[];
  units: string[];
  selectedCategory: MaterialCategoryItem | null;
  saving: boolean;
  onChange: (draft: MaterialDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <tr className="bg-amber-50/60 align-top">
      <td className="px-4 py-3 text-xs font-medium text-slate-500">{selectedCategory?.codePrefix ?? 'MAT'}-auto</td>
      <td className="px-4 py-3" colSpan={7}>
        <EditableMaterialForm draft={draft} categories={categories} units={units} selectedCategory={selectedCategory} compact onChange={onChange} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button className="h-8 rounded-lg px-3 text-xs" onClick={onSave} disabled={saving}>
            {saving ? '...' : 'Yadda saxla'}
          </Button>
          <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={onCancel}>
            Bağla
          </Button>
        </div>
      </td>
    </tr>
  );
}

function EditableMaterialForm({
  draft,
  categories,
  units,
  selectedCategory,
  compact,
  onChange
}: {
  draft: MaterialDraft;
  categories: MaterialCategoryItem[];
  units: string[];
  selectedCategory: MaterialCategoryItem | null;
  compact?: boolean;
  onChange: (draft: MaterialDraft) => void;
}) {
  const fields = selectedCategory?.dynamicFields ?? [];

  const updateMetadata = (key: string, value: unknown) => {
    onChange({
      ...draft,
      metadata: {
        ...draft.metadata,
        [key]: value
      }
    });
  };

  return (
    <div className={`grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
      <Field label="Kateqoriya">
        <select
          value={draft.categoryId}
          onChange={(event) => onChange({ ...draft, categoryId: event.target.value, metadata: {} })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Kateqoriya seçin</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kod">
        <Input value={`${selectedCategory?.codePrefix ?? 'MAT'}-auto`} readOnly />
      </Field>

      <Field label="Məhsulun adı">
        <Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </Field>

      <Field label="Vahid">
        <select value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value, stockUnit: draft.stockUnit || event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Anbar vahidi">
        <select value={draft.stockUnit} onChange={(event) => onChange({ ...draft, stockUnit: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Qablaşdırma vahidi">
        <select value={draft.packageUnit} onChange={(event) => onChange({ ...draft, packageUnit: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">Seçilməyib</option>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Bir qablaşdırmada vahid sayı">
        <Input value={draft.defaultUnitsPerPackage} onChange={(event) => onChange({ ...draft, defaultUnitsPerPackage: event.target.value })} />
      </Field>

      <Field label="Qram">
        <Input value={draft.gram} onChange={(event) => onChange({ ...draft, gram: event.target.value })} />
      </Field>

      <Field label="Ölçü / razmer">
        <Input value={draft.size} onChange={(event) => onChange({ ...draft, size: event.target.value })} />
      </Field>

      <Field label="Qutuda / list sayı">
        <Input value={draft.quantityInPack} onChange={(event) => onChange({ ...draft, quantityInPack: event.target.value })} />
      </Field>

      <Field label="Minimum qalıq">
        <Input value={draft.minStockLevel} onChange={(event) => onChange({ ...draft, minStockLevel: event.target.value })} />
      </Field>

      {fields.map((field) => (
        <DynamicFieldInput key={field.key} field={field} value={draft.metadata[field.key]} onChange={(value) => updateMetadata(field.key, value)} />
      ))}

      <Field label="Qeyd" className={compact ? 'xl:col-span-4' : 'xl:col-span-3'}>
        <Input value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} />
      </Field>

      <label className={`inline-flex items-center gap-2 text-sm text-slate-700 ${compact ? 'xl:col-span-4' : 'xl:col-span-3'}`}>
        <input type="checkbox" checked={draft.vatIncluded} onChange={(event) => onChange({ ...draft, vatIncluded: event.target.checked })} />
        ƏDV daxildir
      </label>

      <label className={`inline-flex items-center gap-2 text-sm text-slate-700 ${compact ? 'xl:col-span-4' : 'xl:col-span-3'}`}>
        <input type="checkbox" checked={draft.isActive} onChange={(event) => onChange({ ...draft, isActive: event.target.checked })} />
        Aktiv material
      </label>
    </div>
  );
}

function DynamicFieldInput({
  field,
  value,
  onChange
}: {
  field: MaterialDynamicField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === 'select') {
    return (
      <Field label={field.label}>
        <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">Seçin</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Field label={field.label}>
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value == null ? '' : String(value)}
        onChange={(event) => onChange(field.type === 'number' ? toNumber(event.target.value) : event.target.value)}
      />
    </Field>
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

function renderMetadataSummary(row: InventoryMaterialItem) {
  const metadata = row.metadata ?? {};
  const fields = row.category?.dynamicFields ?? [];
  const values = fields
    .map((field) => {
      const value = metadata[field.key];
      if (value == null || value === '') return null;

      const optionLabel =
        field.type === 'select'
          ? field.options?.find((option) => option.value === value)?.label ?? String(value)
          : String(value);

      return `${field.label}: ${optionLabel}`;
    })
    .filter(Boolean);

  return values.length ? values.join(', ') : '—';
}
