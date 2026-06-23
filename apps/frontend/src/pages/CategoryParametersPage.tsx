import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Input } from '@bestapp/ui';
import { Plus, PencilLine, Trash2 } from 'lucide-react';
import { PageHeader } from '../shared/components/PageHeader';
import { useToast } from '../shared/toast/toast-context';
import { materialCategoriesClient, type CreateMaterialCategoryParameterDto, type CreateMaterialCategoryParameterValueDto } from '../shared/api/material-categories';
import type { MaterialCategoryItem, MaterialCategoryParameterItem, MaterialCategoryParameterValueItem } from '../shared/materials';

type ParameterDraft = CreateMaterialCategoryParameterDto;
type ValueDraft = CreateMaterialCategoryParameterValueDto;

const emptyParameterDraft: ParameterDraft = {
  name: '',
  sortOrder: 0,
  isActive: true,
  notes: ''
};

const emptyValueDraft: ValueDraft = {
  value: '',
  sortOrder: 0,
  isActive: true,
  notes: ''
};

export function CategoryParametersPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState('');
  const [parameters, setParameters] = useState<MaterialCategoryParameterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parameterModalOpen, setParameterModalOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<MaterialCategoryParameterItem | null>(null);
  const [parameterDraft, setParameterDraft] = useState<ParameterDraft>(emptyParameterDraft);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<MaterialCategoryParameterValueItem | null>(null);
  const [activeParameter, setActiveParameter] = useState<MaterialCategoryParameterItem | null>(null);
  const [valueDraft, setValueDraft] = useState<ValueDraft>(emptyValueDraft);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.code === selectedCategoryCode) ?? categories[0] ?? null,
    [categories, selectedCategoryCode]
  );

  const loadCategories = async () => {
    const rows = await materialCategoriesClient.list();
    setCategories(rows);
    if (!selectedCategoryCode && rows[0]) {
      setSelectedCategoryCode(rows[0].code);
    }
    return rows;
  };

  const loadParameters = async (categoryId: string) => {
    setLoading(true);
    try {
      const rows = await materialCategoriesClient.listParameters(categoryId);
      setParameters(rows);
    } catch (error) {
      toast.error('Parametrlər yüklənmədi', error instanceof Error ? error.message : 'Xəta baş verdi');
      setParameters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const rows = await loadCategories();
      const category = rows[0];
      if (category) {
        await loadParameters(category.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    void loadParameters(selectedCategory.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id]);

  const refresh = async () => {
    if (selectedCategory) {
      await loadParameters(selectedCategory.id);
    }
    await loadCategories();
  };

  const openCreateParameter = () => {
    setEditingParameter(null);
    setParameterDraft(emptyParameterDraft);
    setParameterModalOpen(true);
  };

  const openEditParameter = (parameter: MaterialCategoryParameterItem) => {
    setEditingParameter(parameter);
    setParameterDraft({
      name: parameter.name,
      sortOrder: parameter.sortOrder,
      isActive: parameter.isActive,
      notes: parameter.notes ?? ''
    });
    setParameterModalOpen(true);
  };

  const saveParameter = async () => {
    if (!selectedCategory) return;
    if (!parameterDraft.name.trim()) {
      toast.warning('Parametr adı daxil edin');
      return;
    }

    setSaving(true);
    try {
      if (editingParameter) {
        await materialCategoriesClient.updateParameter(editingParameter.id, parameterDraft);
        toast.success('Parametr yeniləndi');
      } else {
        await materialCategoriesClient.createParameter(selectedCategory.id, parameterDraft);
        toast.success('Parametr əlavə edildi');
      }

      setParameterModalOpen(false);
      await refresh();
    } catch (error) {
      toast.error('Parametr yadda saxlanmadı', error instanceof Error ? error.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const removeParameter = async (parameter: MaterialCategoryParameterItem) => {
    if (!window.confirm(`"${parameter.name}" parametri silinsin?`)) return;
    try {
      await materialCategoriesClient.removeParameter(parameter.id);
      toast.success('Parametr silindi');
      await refresh();
    } catch (error) {
      toast.error('Parametr silinmədi', error instanceof Error ? error.message : 'Xəta baş verdi');
    }
  };

  const openCreateValue = (parameter: MaterialCategoryParameterItem) => {
    setActiveParameter(parameter);
    setEditingValue(null);
    setValueDraft(emptyValueDraft);
    setValueModalOpen(true);
  };

  const openEditValue = (parameter: MaterialCategoryParameterItem, value: MaterialCategoryParameterValueItem) => {
    setActiveParameter(parameter);
    setEditingValue(value);
    setValueDraft({
      value: value.value,
      sortOrder: value.sortOrder,
      isActive: value.isActive,
      notes: value.notes ?? ''
    });
    setValueModalOpen(true);
  };

  const saveValue = async () => {
    if (!activeParameter) return;
    if (!valueDraft.value.trim()) {
      toast.warning('Dəyər daxil edin');
      return;
    }

    setSaving(true);
    try {
      if (editingValue) {
        await materialCategoriesClient.updateValue(editingValue.id, valueDraft);
        toast.success('Dəyər yeniləndi');
      } else {
        await materialCategoriesClient.createValue(activeParameter.id, valueDraft);
        toast.success('Dəyər əlavə edildi');
      }

      setValueModalOpen(false);
      await refresh();
    } catch (error) {
      toast.error('Dəyər yadda saxlanmadı', error instanceof Error ? error.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const removeValue = async (value: MaterialCategoryParameterValueItem) => {
    if (!window.confirm(`"${value.value}" dəyəri silinsin?`)) return;
    try {
      await materialCategoriesClient.removeValue(value.id);
      toast.success('Dəyər silindi');
      await refresh();
    } catch (error) {
      toast.error('Dəyər silinmədi', error instanceof Error ? error.message : 'Xəta baş verdi');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kateqoriya parametrləri"
        description="Hər material kateqoriyası üçün seçim siyahılarını burada idarə edin. Bu siyahılar material əlavə edərkən dropdown kimi istifadə olunur."
        actions={<Button onClick={openCreateParameter}>Parametr əlavə et</Button>}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kateqoriya seçimi</span>
          <select
            value={selectedCategoryCode}
            onChange={(event) => setSelectedCategoryCode(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Yüklənir...</div>
      ) : parameters.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="text-lg font-semibold text-slate-950">Bu kateqoriya üçün parametr yoxdur</div>
          <p className="mt-2 text-sm text-slate-500">Yeni parametr əlavə etməklə seçim siyahısını qurun.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {parameters.map((parameter) => (
            <div key={parameter.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">{parameter.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${parameter.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {parameter.isActive ? 'Aktiv' : 'Deaktiv'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{parameter.values.length} dəyər</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="h-9 px-3" onClick={() => openEditParameter(parameter)}>
                    <span className="inline-flex items-center gap-2">
                      <PencilLine className="h-4 w-4" />
                      Redaktə et
                    </span>
                  </Button>
                  <Button variant="secondary" className="h-9 px-3" onClick={() => openCreateValue(parameter)}>
                    <span className="inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Dəyər əlavə et
                    </span>
                  </Button>
                  <Button variant="ghost" className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => void removeParameter(parameter)}>
                    <span className="inline-flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </span>
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {parameter.values.map((value) => (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => openEditValue(parameter, value)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <span>{value.value}</span>
                    <PencilLine className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {parameterModalOpen ? (
        <Modal title={editingParameter ? 'Parametr redaktəsi' : 'Yeni parametr'} onClose={() => setParameterModalOpen(false)}>
          <div className="space-y-4">
            <Field label="Parametr adı">
              <Input value={parameterDraft.name} onChange={(event) => setParameterDraft((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Sıra nömrəsi">
              <Input
                type="number"
                value={parameterDraft.sortOrder ?? 0}
                onChange={(event) => setParameterDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={parameterDraft.isActive ?? true}
                onChange={(event) => setParameterDraft((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Aktiv
            </label>
            <Field label="Qeyd">
              <textarea
                value={parameterDraft.notes ?? ''}
                onChange={(event) => setParameterDraft((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                rows={3}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setParameterModalOpen(false)} disabled={saving}>
                Ləğv et
              </Button>
              <Button onClick={() => void saveParameter()} disabled={saving}>
                Yadda saxla
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {valueModalOpen ? (
        <Modal title={editingValue ? 'Dəyər redaktəsi' : 'Yeni dəyər'} onClose={() => setValueModalOpen(false)}>
          <div className="space-y-4">
            <Field label="Dəyər">
              <Input value={valueDraft.value} onChange={(event) => setValueDraft((current) => ({ ...current, value: event.target.value }))} />
            </Field>
            <Field label="Sıra nömrəsi">
              <Input
                type="number"
                value={valueDraft.sortOrder ?? 0}
                onChange={(event) => setValueDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={valueDraft.isActive ?? true}
                onChange={(event) => setValueDraft((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Aktiv
            </label>
            <Field label="Qeyd">
              <textarea
                value={valueDraft.notes ?? ''}
                onChange={(event) => setValueDraft((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                rows={3}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setValueModalOpen(false)} disabled={saving}>
                Ləğv et
              </Button>
              <Button onClick={() => void saveValue()} disabled={saving}>
                Yadda saxla
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500" onClick={onClose}>
            Bağla
          </button>
        </div>
        {children}
      </div>
    </div>
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
