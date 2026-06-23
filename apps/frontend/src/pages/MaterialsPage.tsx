import { useEffect, useMemo, useState } from 'react';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS, type MaterialListItem, type MaterialStatusFilter } from '../shared/materials';
import { Button, Input } from '@bestapp/ui';
import { Plus, Search, Trash2, PencilLine, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageHeader } from '../shared/components/PageHeader';
import { useToast } from '../shared/toast/toast-context';
import { materialsClient, type CreateMaterialDto, type UpdateMaterialDto } from '../shared/api/materials';

type MaterialFormState = {
  categoryCode: (typeof MATERIAL_CATEGORIES)[number]['code'];
  name: string;
  materialType: string;
  gramThickness: string;
  formatSize: string;
  unit: (typeof MATERIAL_UNITS)[number]['value'];
  currencyCode: string;
  purchasePrice: string;
  aznPrice: string;
  isActive: boolean;
  notes: string;
};

type QueryState = {
  page: number;
  limit: number;
  search: string;
  categoryCode: string;
  status: MaterialStatusFilter;
};

const defaultFormState: MaterialFormState = {
  categoryCode: MATERIAL_CATEGORIES[0].code,
  name: '',
  materialType: '',
  gramThickness: '',
  formatSize: '',
  unit: MATERIAL_UNITS[0].value,
  currencyCode: 'AZN',
  purchasePrice: '',
  aznPrice: '',
  isActive: true,
  notes: ''
};

const defaultQuery: QueryState = {
  page: 1,
  limit: 20,
  search: '',
  categoryCode: '',
  status: 'all'
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency = 'AZN') {
  return new Intl.NumberFormat('az-AZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function createFormState(material?: MaterialListItem): MaterialFormState {
  if (!material) {
    return defaultFormState;
  }

  return {
    categoryCode: material.categoryCode,
    name: material.name,
    materialType: material.materialType ?? '',
    gramThickness: material.gramThickness ?? '',
    formatSize: material.formatSize ?? '',
    unit: material.unit,
    currencyCode: material.currencyCode ?? 'AZN',
    purchasePrice: String(material.purchasePrice ?? ''),
    aznPrice: String(material.aznPrice ?? ''),
    isActive: material.isActive,
    notes: material.notes ?? ''
  };
}

function toCreateDto(form: MaterialFormState): CreateMaterialDto {
  return {
    categoryCode: form.categoryCode,
    name: form.name.trim(),
    materialType: form.materialType.trim() || undefined,
    gramThickness: form.gramThickness.trim() || undefined,
    formatSize: form.formatSize.trim() || undefined,
    unit: form.unit,
    currencyCode: form.currencyCode.trim() || 'AZN',
    purchasePrice: form.purchasePrice ? toNumber(form.purchasePrice) : 0,
    aznPrice: form.aznPrice ? toNumber(form.aznPrice) : 0,
    isActive: form.isActive,
    notes: form.notes.trim() || undefined
  };
}

function toUpdateDto(form: MaterialFormState): UpdateMaterialDto {
  return toCreateDto(form);
}

export function MaterialsPage() {
  const toast = useToast();
  const [items, setItems] = useState<MaterialListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<QueryState>(defaultQuery);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialListItem | null>(null);
  const [formState, setFormState] = useState<MaterialFormState>(defaultFormState);

  const selectedCategoryLabel = useMemo(
    () => MATERIAL_CATEGORIES.find((item) => item.code === formState.categoryCode)?.label ?? 'Kateqoriya',
    [formState.categoryCode]
  );

  const loadMaterials = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const response = await materialsClient.list({
        page: nextQuery.page,
        limit: nextQuery.limit,
        search: nextQuery.search || undefined,
        categoryCode: nextQuery.categoryCode || undefined,
        status: nextQuery.status
      });

      setItems(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Materiallar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials(query);
  }, [query.page, query.limit, query.search, query.categoryCode, query.status]);

  const openCreate = () => {
    setEditingItem(null);
    setFormState(defaultFormState);
    setModalOpen(true);
  };

  const openEdit = (item: MaterialListItem) => {
    setEditingItem(item);
    setFormState(createFormState(item));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormState(defaultFormState);
  };

  const saveMaterial = async () => {
    if (!formState.name.trim()) {
      toast.warning('Material adı daxil edin');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await materialsClient.update(editingItem.id, toUpdateDto(formState));
        toast.success('Material yeniləndi');
      } else {
        await materialsClient.create(toCreateDto(formState));
        toast.success('Material yaradıldı');
      }

      closeModal();
      await loadMaterials(query);
    } catch (saveError) {
      toast.error(
        editingItem ? 'Material yenilənmədi' : 'Material yaradılmadı',
        saveError instanceof Error ? saveError.message : 'Xəta baş verdi'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: MaterialListItem) => {
    try {
      await materialsClient.update(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Material deaktiv edildi' : 'Material aktiv edildi');
      await loadMaterials(query);
    } catch (toggleError) {
      toast.error('Status dəyişmədi', toggleError instanceof Error ? toggleError.message : 'Xəta baş verdi');
    }
  };

  const deleteMaterial = async (item: MaterialListItem) => {
    const confirmed = window.confirm(`"${item.name}" materialı silinsin?`);
    if (!confirmed) {
      return;
    }

    try {
      await materialsClient.remove(item.id);
      toast.success('Material silindi');
      await loadMaterials(query);
    } catch (removeError) {
      toast.error('Material silinmədi', removeError instanceof Error ? removeError.message : 'Xəta baş verdi');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiallar"
        description="Bu bölmə yalnız material kataloqu üçündür. Anbar və alış modulları daha sonra əlavə olunacaq."
        actions={
          <Button onClick={openCreate}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Yeni material
            </span>
          </Button>
        }
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Axtarış</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query.search}
                onChange={(event) => setQuery((current) => ({ ...current, page: 1, search: event.target.value }))}
                placeholder="Material adına görə axtar"
                className="pl-10"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Kateqoriya</span>
            <select
              value={query.categoryCode}
              onChange={(event) => setQuery((current) => ({ ...current, page: 1, categoryCode: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Bütün kateqoriyalar</option>
              {MATERIAL_CATEGORIES.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={query.status}
              onChange={(event) => setQuery((current) => ({ ...current, page: 1, status: event.target.value as MaterialStatusFilter }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="all">Hamısı</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Deaktiv</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Səhifə ölçüsü</span>
            <select
              value={query.limit}
              onChange={(event) => setQuery((current) => ({ ...current, page: 1, limit: Number(event.target.value) }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              {[10, 20, 50].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Yüklənir...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Məlumat yüklənmədi</div>
          <div className="mt-1">{error}</div>
          <Button className="mt-4" variant="secondary" onClick={() => void loadMaterials(query)}>
            Yenidən cəhd et
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="text-lg font-semibold text-slate-950">Material tapılmadı</div>
          <p className="mt-2 text-sm text-slate-500">Filtrləri dəyişin və ya yeni material əlavə edin.</p>
          <Button className="mt-5" onClick={openCreate}>
            Yeni material
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Material №', 'Kateqoriya', 'Material adı', 'Növ', 'Qram / qalınlıq', 'Format / ölçü', 'Ölçü vahidi', 'AZN qiyməti', 'Status', 'Əməliyyatlar'].map((header) => (
                      <th
                        key={header}
                        className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-950">{item.materialNo}</td>
                      <td className="px-4 py-3">{item.categoryLabel}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.materialType || '—'}</td>
                      <td className="px-4 py-3">{item.gramThickness || '—'}</td>
                      <td className="px-4 py-3">{item.formatSize || '—'}</td>
                      <td className="px-4 py-3">{item.unit}</td>
                      <td className="px-4 py-3">{formatMoney(item.aznPrice, item.currencyCode)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                            item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          ].join(' ')}
                        >
                          {item.isActive ? 'Aktiv' : 'Deaktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" className="h-9 px-3" onClick={() => openEdit(item)}>
                            <span className="inline-flex items-center gap-2">
                              <PencilLine className="h-4 w-4" />
                              Redaktə et
                            </span>
                          </Button>
                          <Button variant="secondary" className="h-9 px-3" onClick={() => void toggleActive(item)}>
                            <span className="inline-flex items-center gap-2">
                              {item.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                              {item.isActive ? 'Deaktiv et' : 'Aktiv et'}
                            </span>
                          </Button>
                          <Button variant="ghost" className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => void deleteMaterial(item)}>
                            <span className="inline-flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              Səhifə {query.page} / {totalPages} · Cəmi {totalItems} material
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setQuery((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
                disabled={query.page <= 1}
              >
                Geri
              </Button>
              <Button
                variant="secondary"
                onClick={() => setQuery((current) => ({ ...current, page: Math.min(current.page + 1, totalPages) }))}
                disabled={query.page >= totalPages}
              >
                İrəli
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{editingItem ? 'Materialı redaktə et' : 'Yeni material'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingItem ? 'Mövcud material məlumatlarını yeniləyin.' : 'Kataloqa yeni material əlavə edin.'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
                onClick={closeModal}
                disabled={saving}
              >
                Bağla
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Material №</span>
                <Input value={editingItem?.materialNo ?? 'Avtomatik yaradılır'} disabled />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Kateqoriya</span>
                <select
                  value={formState.categoryCode}
                  onChange={(event) => setFormState((current) => ({ ...current, categoryCode: event.target.value as MaterialFormState['categoryCode'] }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {MATERIAL_CATEGORIES.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Material adı</span>
                <Input value={formState.name} onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Növ</span>
                <Input
                  value={formState.materialType}
                  onChange={(event) => setFormState((current) => ({ ...current, materialType: event.target.value }))}
                  placeholder="Məsələn: Kağız"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Qram / qalınlıq</span>
                <Input
                  value={formState.gramThickness}
                  onChange={(event) => setFormState((current) => ({ ...current, gramThickness: event.target.value }))}
                  placeholder="Məsələn: 80 qr"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Format / ölçü</span>
                <Input
                  value={formState.formatSize}
                  onChange={(event) => setFormState((current) => ({ ...current, formatSize: event.target.value }))}
                  placeholder="Məsələn: 64x90"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Ölçü vahidi</span>
                <select
                  value={formState.unit}
                  onChange={(event) => setFormState((current) => ({ ...current, unit: event.target.value as MaterialFormState['unit'] }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {MATERIAL_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Valyuta</span>
                <Input value={formState.currencyCode} onChange={(event) => setFormState((current) => ({ ...current, currencyCode: event.target.value }))} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Alış qiyməti</span>
                <Input
                  type="number"
                  step="0.01"
                  value={formState.purchasePrice}
                  onChange={(event) => setFormState((current) => ({ ...current, purchasePrice: event.target.value }))}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">AZN qiyməti</span>
                <Input
                  type="number"
                  step="0.01"
                  value={formState.aznPrice}
                  onChange={(event) => setFormState((current) => ({ ...current, aznPrice: event.target.value }))}
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Aktiv material
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Qeyd</span>
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  placeholder="Əlavə məlumat"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">Seçilmiş kateqoriya: {selectedCategoryLabel}</div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={closeModal} disabled={saving}>
                  Ləğv et
                </Button>
                <Button onClick={() => void saveMaterial()} disabled={saving}>
                  {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
