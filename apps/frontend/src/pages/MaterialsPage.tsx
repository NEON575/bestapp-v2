import { useEffect, useState } from 'react';
import type { CreateMaterialDto, InventoryMaterialItem, MaterialCategoryItem, MaterialQueryDto, SupplierItem } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { purchasesClient } from '../shared/api/purchases';
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type MaterialDraft = {
  categoryId: string;
  supplierId: string;
  sku: string;
  name: string;
  unit: string;
  gram: number;
  size: string;
  quantityInPack: number;
  packPrice: number;
  unitCost: number;
  vatIncluded: boolean;
  minStockLevel: number;
  notes: string;
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDraft(row: InventoryMaterialItem): MaterialDraft {
  return {
    categoryId: row.category?.id ?? '',
    supplierId: row.supplier?.id ?? '',
    sku: row.sku ?? '',
    name: row.name,
    unit: row.unit,
    gram: Number(row.gram ?? 0),
    size: row.size ?? '',
    quantityInPack: Number(row.quantityInPack ?? 1),
    packPrice: Number(row.packPrice ?? 0),
    unitCost: Number(row.unitCost ?? row.costPrice ?? 0),
    vatIncluded: Boolean(row.vatIncluded),
    minStockLevel: Number(row.minStockLevel ?? 0),
    notes: row.notes ?? ''
  };
}

const emptyDraft: MaterialDraft = {
  categoryId: '',
  supplierId: '',
  sku: '',
  name: '',
  unit: 'ədəd',
  gram: 0,
  size: '',
  quantityInPack: 1,
  packPrice: 0,
  unitCost: 0,
  vatIncluded: false,
  minStockLevel: 0,
  notes: ''
};

function toCreateMaterialDto(draft: MaterialDraft): CreateMaterialDto {
  return {
    categoryId: draft.categoryId || undefined,
    supplierId: draft.supplierId || undefined,
    sku: draft.sku || undefined,
    name: draft.name,
    unit: draft.unit,
    gram: draft.gram || undefined,
    size: draft.size || undefined,
    quantityInPack: draft.quantityInPack || 1,
    packPrice: draft.packPrice || 0,
    unitCost: draft.unitCost || undefined,
    vatIncluded: draft.vatIncluded,
    minStockLevel: draft.minStockLevel || 0,
    notes: draft.notes || undefined
  };
}

export function MaterialsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<InventoryMaterialItem[]>([]);
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<MaterialQueryDto>({
    page: 1,
    limit: 25,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    categoryId: '',
    supplierId: '',
    size: '',
    lowStockOnly: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState<MaterialDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [list, categoryList, supplierList] = await Promise.all([
        inventoryClient.materials(nextQuery),
        inventoryClient.categories(),
        purchasesClient.listSuppliers()
      ]);
      setRows(list.data);
      setMeta(list.meta);
      setCategories(categoryList);
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Materiallar siyahısı yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.categoryId, query.supplierId, query.gram, query.size, query.lowStockOnly]);

  const saveRow = async (id: string, source: MaterialDraft) => {
    if (!source.name.trim() || !source.unit.trim()) {
      toast.error('Ad və vahid vacibdir');
      return;
    }

    setSaving(true);
    try {
      await inventoryClient.updateMaterial(id, toCreateMaterialDto(source));
      toast.success('Material yeniləndi');
      setEditingId(null);
      setDraft(null);
      await load(query);
    } catch (e) {
      toast.error('Material yenilənmədi', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveQuick = async () => {
    if (!quickDraft.name.trim() || !quickDraft.unit.trim()) {
      toast.error('Ad və vahid vacibdir');
      return;
    }

    setSaving(true);
    try {
      await inventoryClient.createMaterial(toCreateMaterialDto(quickDraft));
      toast.success('Material yaradıldı');
      setQuickOpen(false);
      setQuickDraft(emptyDraft);
      await load(query);
    } catch (e) {
      toast.error('Material yaradılmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
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
        description="Kağız daxil olmaqla bütün istehsal materialları üçün vahid kataloq."
        actions={<Button onClick={() => setQuickOpen(true)}>Yeni material</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-full lg:w-64">
          <Input
            value={query.search ?? ''}
            onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))}
            placeholder="Kod, ad, razmer və ya təchizatçı"
          />
        </div>
        <div className="w-full lg:w-56">
          <select
            value={query.categoryId ?? ''}
            onChange={(event) => setQuery((current) => ({ ...current, categoryId: event.target.value, page: 1 }))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün kateqoriyalar</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full lg:w-56">
          <select
            value={query.supplierId ?? ''}
            onChange={(event) => setQuery((current) => ({ ...current, supplierId: event.target.value, page: 1 }))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün təchizatçılar</option>
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full lg:w-36">
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

      {!rows.length && !quickOpen ? (
        <EmptyState title="Material tapılmadı" description="Filtrləri dəyişin və ya yeni material əlavə edin." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Kod',
                    'Ad',
                    'Kateqoriya',
                    'Təchizatçı',
                    'Vahid',
                    'Qram',
                    'Razmer',
                    'Qutuda/List sayı',
                    'Qiymət',
                    '1 vahid qiyməti',
                    'ƏDV',
                    'Minimum qalıq',
                    'Qeyd',
                    'Əməliyyat'
                  ].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quickOpen ? (
                  <MaterialEditRow
                    draft={quickDraft}
                    categories={categories}
                    suppliers={suppliers}
                    saving={saving}
                    onChange={setQuickDraft}
                    onCancel={() => {
                      setQuickOpen(false);
                      setQuickDraft(emptyDraft);
                    }}
                    onSave={() => void saveQuick()}
                  />
                ) : null}

                {rows.map((row) =>
                  editingId === row.id && draft ? (
                    <MaterialEditRow
                      key={row.id}
                      draft={draft}
                      categories={categories}
                      suppliers={suppliers}
                      saving={saving}
                      onChange={setDraft}
                      onCancel={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      onSave={() => void saveRow(row.id, draft)}
                    />
                  ) : (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-950">{row.sku ?? '—'}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.category?.name ?? '—'}</td>
                      <td className="px-4 py-3">{row.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-3">{row.unit}</td>
                      <td className="px-4 py-3">{row.gram ? formatNumber(row.gram, 0) : '—'}</td>
                      <td className="px-4 py-3">{row.size ?? '—'}</td>
                      <td className="px-4 py-3">{row.quantityInPack ? formatNumber(row.quantityInPack, 0) : '—'}</td>
                      <td className="px-4 py-3">{formatCurrency(row.packPrice)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(row.unitCost ?? row.costPrice)}</td>
                      <td className="px-4 py-3">{row.vatIncluded ? 'Bəli' : 'Xeyr'}</td>
                      <td className="px-4 py-3">{formatNumber(row.minStockLevel)}</td>
                      <td className="px-4 py-3">{row.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Button
                          className="h-8 rounded-lg px-3 text-xs"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(row.id);
                            setDraft(createDraft(row));
                          }}
                        >
                          Düzəliş
                        </Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
      />
    </div>
  );
}

function MaterialEditRow({
  draft,
  categories,
  suppliers,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  draft: MaterialDraft;
  categories: MaterialCategoryItem[];
  suppliers: SupplierItem[];
  saving: boolean;
  onChange: (draft: MaterialDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const calculatedUnitCost = draft.quantityInPack > 0 ? draft.packPrice / draft.quantityInPack : 0;
  const displayedUnitCost = draft.unitCost > 0 ? draft.unitCost : calculatedUnitCost;

  return (
    <tr className="bg-amber-50/60">
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" value={draft.sku} onChange={(event) => onChange({ ...draft, sku: event.target.value })} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </td>
      <td className="px-4 py-2">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.categoryId} onChange={(event) => onChange({ ...draft, categoryId: event.target.value })}>
          <option value="">Kateqoriya</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.supplierId} onChange={(event) => onChange({ ...draft, supplierId: event.target.value })}>
          <option value="">Təchizatçı</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value })} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.gram} onChange={(event) => onChange({ ...draft, gram: toNumber(event.target.value) })} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" value={draft.size} onChange={(event) => onChange({ ...draft, size: event.target.value })} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.quantityInPack} onChange={(event) => onChange({ ...draft, quantityInPack: toNumber(event.target.value) || 1 })} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.packPrice} onChange={(event) => onChange({ ...draft, packPrice: toNumber(event.target.value) })} />
      </td>
      <td className="px-4 py-2 font-semibold">{formatCurrency(displayedUnitCost)}</td>
      <td className="px-4 py-2">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={draft.vatIncluded} onChange={(event) => onChange({ ...draft, vatIncluded: event.target.checked })} />
          ƏDV
        </label>
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.minStockLevel} onChange={(event) => onChange({ ...draft, minStockLevel: toNumber(event.target.value) })} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-9 rounded-lg px-2" value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} />
      </td>
      <td className="px-4 py-2">
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
