import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
  AppPreferences,
  CompanySettings,
  CreateEmployeeDto,
  CreateMaterialCategoryDto,
  CreateSystemOptionDto,
  CreateUnitDto,
  EmployeeItem,
  MaterialCategoryItem,
  MaterialDynamicField,
  SettingUnitItem,
  SettingsReferenceGroup,
  SystemOptionItem,
  UpdateEmployeeDto,
  UpdateSystemOptionDto,
  UpdateUnitDto
} from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { salariesClient } from '../shared/api/salaries';
import { settingsClient } from '../shared/api/settings';
import { ErrorState, LoadingState, PageHeader } from '../shared/components';
import { useLanguage } from '../shared/i18n/language-context';
import { useToast } from '../shared/toast/toast-context';

type SettingsTab = 'company' | 'language' | 'employees' | 'units' | 'categories' | 'references';

const availableDynamicFields: MaterialDynamicField[] = [
  { key: 'type', label: 'Tip', type: 'text' },
  { key: 'gram', label: 'Qram', type: 'number' },
  { key: 'size', label: 'Razmer', type: 'text' },
  { key: 'sheetCount', label: 'List sayı', type: 'number' },
  {
    key: 'finish',
    label: 'Səth',
    type: 'select',
    options: [
      { label: 'Parlaq', value: 'parlaq' },
      { label: 'Mat', value: 'mat' },
      { label: 'Məxmər', value: 'mexmer' }
    ]
  }
];

function emptyCompany(): CompanySettings {
  return {
    companyName: '',
    legalName: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    bankName: '',
    bankAccount: '',
    iban: '',
    bankCode: '',
    correspondentAccount: '',
    swift: '',
    logoUrl: '',
    notes: ''
  };
}

function emptyEmployee(): CreateEmployeeDto {
  return {
    fullName: '',
    phone: '',
    title: '',
    roleKey: 'manager',
    notes: '',
    isActive: true
  };
}

function emptyCategory(): CreateMaterialCategoryDto {
  return {
    code: '',
    name: '',
    codePrefix: '',
    description: '',
    isActive: true,
    dynamicFields: []
  };
}

function emptyReference(groupKey: string): CreateSystemOptionDto {
  return {
    groupKey,
    value: '',
    labelAz: '',
    labelRu: '',
    sortOrder: 0,
    isActive: true
  };
}

function emptyUnit(): CreateUnitDto {
  return {
    value: '',
    labelAz: '',
    labelRu: '',
    sortOrder: 0,
    isActive: true
  };
}

export function SettingsPage() {
  const toast = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanySettings>(emptyCompany());
  const [preferences, setPreferences] = useState<AppPreferences>({ language: 'az' });
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [employeeDraft, setEmployeeDraft] = useState<CreateEmployeeDto>(emptyEmployee());
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  const [units, setUnits] = useState<SettingUnitItem[]>([]);
  const [unitDraft, setUnitDraft] = useState<CreateUnitDto>(emptyUnit());
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<CreateMaterialCategoryDto>(emptyCategory());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [referenceGroups, setReferenceGroups] = useState<SettingsReferenceGroup[]>([]);
  const [selectedReferenceGroup, setSelectedReferenceGroup] = useState('payment_types');
  const [referenceDraft, setReferenceDraft] = useState<CreateSystemOptionDto>(emptyReference('payment_types'));
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);

  const [savingCompany, setSavingCompany] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingReference, setSavingReference] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [companyResponse, preferencesResponse, employeesResponse, unitsResponse, categoriesResponse, referencesResponse] = await Promise.all([
        settingsClient.company(),
        settingsClient.preferences(),
        salariesClient.listEmployees(),
        settingsClient.units(),
        inventoryClient.categories(),
        settingsClient.references()
      ]);

      setCompany({ ...emptyCompany(), ...companyResponse });
      setPreferences(preferencesResponse);
      await setLanguage(preferencesResponse.language, { persist: false });
      setEmployees(employeesResponse);
      setUnits(unitsResponse);
      setCategories(categoriesResponse);
      setReferenceGroups(referencesResponse.groups);
      setSelectedReferenceGroup(referencesResponse.groups[0]?.key ?? 'payment_types');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Ayarlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setReferenceDraft((current) => ({
      ...current,
      groupKey: selectedReferenceGroup
    }));
  }, [selectedReferenceGroup]);

  const currentReferenceItems = useMemo(
    () => referenceGroups.find((group) => group.key === selectedReferenceGroup)?.items ?? [],
    [referenceGroups, selectedReferenceGroup]
  );

  const selectedDynamicFieldKeys = useMemo(
    () => new Set((categoryDraft.dynamicFields ?? []).map((field) => field.key)),
    [categoryDraft.dynamicFields]
  );

  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      const updated = await settingsClient.updateCompany(company);
      setCompany(updated);
      toast.success('Şirkət məlumatları yeniləndi');
    } catch (saveError) {
      toast.error('Şirkət məlumatları saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingCompany(false);
    }
  };

  const saveLanguage = async () => {
    setSavingLanguage(true);
    try {
      const updated = await settingsClient.updatePreferences(preferences);
      setPreferences(updated);
      await setLanguage(updated.language);
      toast.success('Dil ayarı yeniləndi');
    } catch (saveError) {
      toast.error('Dil ayarı saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingLanguage(false);
    }
  };

  const saveEmployee = async () => {
    if (!employeeDraft.fullName.trim()) {
      toast.warning('İşçi adı vacibdir');
      return;
    }

    setSavingEmployee(true);
    try {
      if (editingEmployeeId) {
        await salariesClient.updateEmployee(editingEmployeeId, employeeDraft as UpdateEmployeeDto);
      } else {
        await salariesClient.createEmployee(employeeDraft);
      }

      setEmployeeDraft(emptyEmployee());
      setEditingEmployeeId(null);
      await load();
      toast.success(editingEmployeeId ? 'İşçi yeniləndi' : 'İşçi əlavə olundu');
    } catch (saveError) {
      toast.error('İşçi saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingEmployee(false);
    }
  };

  const toggleEmployee = async (employee: EmployeeItem, isActive: boolean) => {
    try {
      await salariesClient.updateEmployee(employee.id, { isActive });
      await load();
      toast.success(isActive ? 'İşçi aktiv edildi' : 'İşçi passiv edildi');
    } catch (saveError) {
      toast.error('İşçi yenilənmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      await salariesClient.removeEmployee(employeeId);
      if (editingEmployeeId === employeeId) {
        setEditingEmployeeId(null);
        setEmployeeDraft(emptyEmployee());
      }
      await load();
      toast.success('İşçi silindi');
    } catch (saveError) {
      toast.error('İşçi silinmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const saveUnit = async () => {
    if (!unitDraft.labelAz.trim() || !unitDraft.value.trim()) {
      toast.warning('Vahidin adı və dəyəri vacibdir');
      return;
    }

    setSavingUnit(true);
    try {
      if (editingUnitId) {
        await settingsClient.updateUnit(editingUnitId, unitDraft as UpdateUnitDto);
      } else {
        await settingsClient.createUnit(unitDraft);
      }

      setUnitDraft(emptyUnit());
      setEditingUnitId(null);
      await load();
      toast.success(editingUnitId ? 'Vahid yeniləndi' : 'Vahid əlavə olundu');
    } catch (saveError) {
      toast.error('Vahid saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingUnit(false);
    }
  };

  const toggleUnit = async (unit: SettingUnitItem, isActive: boolean) => {
    try {
      if (isActive) {
        await settingsClient.activateUnit(unit.id);
      } else {
        await settingsClient.deactivateUnit(unit.id);
      }
      await load();
      toast.success(isActive ? 'Vahid aktiv edildi' : 'Vahid passiv edildi');
    } catch (saveError) {
      toast.error('Vahid yenilənmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const deleteUnit = async (unitId: string) => {
    try {
      await settingsClient.removeUnit(unitId);
      if (editingUnitId === unitId) {
        setEditingUnitId(null);
        setUnitDraft(emptyUnit());
      }
      await load();
      toast.success('Vahid silindi');
    } catch (saveError) {
      toast.error('Vahid silinmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const saveCategory = async () => {
    if (!categoryDraft.name?.trim() || !categoryDraft.code?.trim()) {
      toast.warning('Kateqoriya adı və kodu vacibdir');
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategoryId) {
        await inventoryClient.updateCategory(editingCategoryId, categoryDraft);
      } else {
        await inventoryClient.createCategory(categoryDraft);
      }
      setCategoryDraft(emptyCategory());
      setEditingCategoryId(null);
      await load();
      toast.success(editingCategoryId ? 'Kateqoriya yeniləndi' : 'Kateqoriya yaradıldı');
    } catch (saveError) {
      toast.error('Kateqoriya saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleCategory = async (category: MaterialCategoryItem, isActive: boolean) => {
    try {
      await inventoryClient.updateCategory(category.id, { isActive });
      await load();
      toast.success(isActive ? 'Kateqoriya aktiv edildi' : 'Kateqoriya passiv edildi');
    } catch (saveError) {
      toast.error('Kateqoriya yenilənmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      await inventoryClient.removeCategory(categoryId);
      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setCategoryDraft(emptyCategory());
      }
      await load();
      toast.success('Kateqoriya silindi');
    } catch (saveError) {
      toast.error('Kateqoriya silinmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const toggleDynamicField = (field: MaterialDynamicField) => {
    const current = categoryDraft.dynamicFields ?? [];
    const exists = current.some((item) => item.key === field.key);
    setCategoryDraft((prev) => ({
      ...prev,
      dynamicFields: exists ? current.filter((item) => item.key !== field.key) : [...current, field]
    }));
  };

  const saveReference = async () => {
    if (!referenceDraft.value.trim() || !referenceDraft.labelAz.trim() || !referenceDraft.labelRu.trim()) {
      toast.warning('Dəyər və hər iki dil üçün başlıq vacibdir');
      return;
    }

    setSavingReference(true);
    try {
      if (editingReferenceId) {
        await settingsClient.updateReference(editingReferenceId, referenceDraft as UpdateSystemOptionDto);
      } else {
        await settingsClient.createReference(referenceDraft);
      }
      setReferenceDraft(emptyReference(selectedReferenceGroup));
      setEditingReferenceId(null);
      await load();
      toast.success(editingReferenceId ? 'Element yeniləndi' : 'Element əlavə olundu');
    } catch (saveError) {
      toast.error('Element saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingReference(false);
    }
  };

  const toggleReference = async (item: SystemOptionItem, isActive: boolean) => {
    try {
      await settingsClient.updateReference(item.id, { isActive });
      await load();
      toast.success(isActive ? 'Element aktiv edildi' : 'Element passiv edildi');
    } catch (saveError) {
      toast.error('Element yenilənmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  const deleteReference = async (id: string) => {
    try {
      await settingsClient.removeReference(id);
      if (editingReferenceId === id) {
        setEditingReferenceId(null);
        setReferenceDraft(emptyReference(selectedReferenceGroup));
      }
      await load();
      toast.success('Element silindi');
    } catch (saveError) {
      toast.error('Element silinmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    }
  };

  if (loading) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('settings.title', 'Ayarlar')}
        description={t('settings.description', 'Şirkət məlumatları, dil, işçilər və sistem siyahıları burada idarə olunur.')}
      />

      <div className="flex flex-wrap gap-2">
        {[
          ['company', 'Şirkət'],
          ['language', 'Dil'],
          ['employees', 'İşçilər'],
          ['units', 'Vahidlər'],
          ['categories', 'Material kateqoriyaları'],
          ['references', 'Seçim siyahıları']
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as SettingsTab)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              activeTab === key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'company' ? (
        <Card className="p-5">
          <SectionHeader
            title="Şirkət məlumatları"
            description="Qaimə, sənəd və hesabatlarda istifadə olunacaq əsas məlumatlar."
            action={
              <Button onClick={() => void saveCompany()} disabled={savingCompany}>
                {savingCompany ? 'Saxlanılır...' : 'Yadda saxla'}
              </Button>
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['companyName', 'Şirkət adı'],
              ['legalName', 'Hüquqi ad'],
              ['taxId', 'VÖEN'],
              ['phone', 'Telefon'],
              ['email', 'Email'],
              ['address', 'Ünvan'],
              ['bankName', 'Bank adı'],
              ['bankAccount', 'Bank hesabı'],
              ['iban', 'IBAN'],
              ['bankCode', 'Kod'],
              ['correspondentAccount', 'Müxbir hesab'],
              ['swift', 'SWIFT']
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={String(company[key as keyof CompanySettings] ?? '')}
                  onChange={(event) => setCompany((current) => ({ ...current, [key]: event.target.value }))}
                />
              </Field>
            ))}

            <Field label="Logo URL">
              <Input value={company.logoUrl ?? ''} onChange={(event) => setCompany((current) => ({ ...current, logoUrl: event.target.value }))} />
            </Field>
            <Field label="Qeyd" className="md:col-span-2">
              <textarea
                value={company.notes ?? ''}
                onChange={(event) => setCompany((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {activeTab === 'language' ? (
        <Card className="p-5">
          <SectionHeader
            title="Dil və lokalizasiya"
            description="İnterfeys dili default olaraq Azərbaycan dilidir."
            action={
              <Button onClick={() => void saveLanguage()} disabled={savingLanguage}>
                {savingLanguage ? 'Saxlanılır...' : 'Yadda saxla'}
              </Button>
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="İnterfeys dili">
              <select
                value={preferences.language}
                onChange={(event) => setPreferences({ language: event.target.value as 'az' | 'ru' })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="az">{t('language.az', 'Azərbaycan dili')}</option>
                <option value="ru">{t('language.ru', 'Русский язык')}</option>
              </select>
            </Field>

            <Field label="Aktiv seçim">
              <Input value={language === 'az' ? 'Azərbaycan dili' : 'Русский язык'} readOnly />
            </Field>
          </div>
        </Card>
      ) : null}

      {activeTab === 'employees' ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
          <Card className="p-5">
            <SectionHeader title="İşçi forması" description="Burada əlavə etdiyiniz menecer sifarişdə dropdown-da görünəcək." />
            <div className="mt-4 grid gap-3">
              <Field label="Ad soyad">
                <Input value={employeeDraft.fullName} onChange={(event) => setEmployeeDraft((current) => ({ ...current, fullName: event.target.value }))} />
              </Field>
              <Field label="Telefon">
                <Input value={employeeDraft.phone ?? ''} onChange={(event) => setEmployeeDraft((current) => ({ ...current, phone: event.target.value }))} />
              </Field>
              <Field label="Vəzifə">
                <Input value={employeeDraft.title ?? ''} onChange={(event) => setEmployeeDraft((current) => ({ ...current, title: event.target.value }))} />
              </Field>
              <Field label="Rol">
                <select
                  value={employeeDraft.roleKey ?? 'manager'}
                  onChange={(event) => setEmployeeDraft((current) => ({ ...current, roleKey: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="owner">Direktor</option>
                  <option value="manager">Menecer</option>
                  <option value="production">İstehsal</option>
                  <option value="accountant">Mühasib</option>
                  <option value="warehouse">Anbar</option>
                  <option value="other">Digər</option>
                </select>
              </Field>
              <Field label="Qeyd">
                <Input value={employeeDraft.notes ?? ''} onChange={(event) => setEmployeeDraft((current) => ({ ...current, notes: event.target.value }))} />
              </Field>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={employeeDraft.isActive ?? true} onChange={(event) => setEmployeeDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                Aktiv işçi
              </label>
              <div className="flex gap-2">
                <Button onClick={() => void saveEmployee()} disabled={savingEmployee}>
                  {savingEmployee ? 'Saxlanılır...' : editingEmployeeId ? 'Yenilə' : 'Əlavə et'}
                </Button>
                {editingEmployeeId ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingEmployeeId(null);
                      setEmployeeDraft(emptyEmployee());
                    }}
                  >
                    Təmizlə
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="İşçi siyahısı" description="Menecer, maaş və istehsal axınında istifadə olunan işçilər." />
            <div className="mt-4 space-y-3">
              {employees.map((employee) => (
                <EntityRow
                  key={employee.id}
                  title={employee.fullName}
                  subtitle={[employee.title, employee.roleKey, employee.phone].filter(Boolean).join(' • ') || 'Məlumat yoxdur'}
                  status={employee.isActive ? 'Aktiv' : 'Passiv'}
                  active={employee.isActive}
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          setEditingEmployeeId(employee.id);
                          setEmployeeDraft({
                            fullName: employee.fullName,
                            phone: employee.phone ?? '',
                            title: employee.title ?? '',
                            roleKey: employee.roleKey ?? 'other',
                            notes: employee.notes ?? '',
                            isActive: employee.isActive
                          });
                        }}
                      >
                        Düzəliş
                      </Button>
                      <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => void toggleEmployee(employee, !employee.isActive)}>
                        {employee.isActive ? 'Passiv et' : 'Aktiv et'}
                      </Button>
                      <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs text-rose-600" onClick={() => void deleteEmployee(employee.id)}>
                        Sil
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'units' ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
          <Card className="p-5">
            <SectionHeader title="Vahid forması" description="Material və alış axınında istifadə olunan vahidləri buradan idarə edin." />
            <div className="mt-4 grid gap-3">
              <Field label="Ad">
                <Input value={unitDraft.labelAz} onChange={(event) => setUnitDraft((current) => ({ ...current, labelAz: event.target.value }))} />
              </Field>
              <Field label="Dəyər">
                <Input value={unitDraft.value} onChange={(event) => setUnitDraft((current) => ({ ...current, value: event.target.value }))} />
              </Field>
              <Field label="Rus adı">
                <Input value={unitDraft.labelRu} onChange={(event) => setUnitDraft((current) => ({ ...current, labelRu: event.target.value }))} />
              </Field>
              <Field label="Sıra">
                <Input
                  type="number"
                  value={unitDraft.sortOrder ?? 0}
                  onChange={(event) => setUnitDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))}
                />
              </Field>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={unitDraft.isActive ?? true} onChange={(event) => setUnitDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                Aktiv vahid
              </label>
              <div className="flex gap-2">
                <Button onClick={() => void saveUnit()} disabled={savingUnit}>
                  {savingUnit ? 'Saxlanılır...' : editingUnitId ? 'Yenilə' : 'Əlavə et'}
                </Button>
                {editingUnitId ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingUnitId(null);
                      setUnitDraft(emptyUnit());
                    }}
                  >
                    Təmizlə
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Vahidlər" description="Sistem boyunca istifadə olunan vahidlər siyahısı." />
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Ad', 'Dəyər', 'Sıra', 'Status', 'Əməliyyat'].map((header) => (
                      <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-950">{unit.labelAz}</td>
                      <td className="px-4 py-3 text-slate-500">{unit.value}</td>
                      <td className="px-4 py-3">{unit.sortOrder}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${unit.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {unit.isActive ? 'Aktiv' : 'Passiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            className="h-8 rounded-lg px-3 text-xs"
                            onClick={() => {
                              setEditingUnitId(unit.id);
                              setUnitDraft({
                                value: unit.value,
                                labelAz: unit.labelAz,
                                labelRu: unit.labelRu,
                                sortOrder: unit.sortOrder,
                                isActive: unit.isActive
                              });
                            }}
                          >
                            Düzəliş
                          </Button>
                          <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => void toggleUnit(unit, !unit.isActive)}>
                            {unit.isActive ? 'Passiv et' : 'Aktiv et'}
                          </Button>
                          <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs text-rose-600" onClick={() => void deleteUnit(unit.id)}>
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'categories' ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
          <Card className="p-5">
            <SectionHeader title="Material kateqoriyası" description="Dinamik sahələri ilə birlikdə material kateqoriyalarını idarə edin." />
            <div className="mt-4 grid gap-3">
              <Field label="Kod">
                <Input value={categoryDraft.code} onChange={(event) => setCategoryDraft((current) => ({ ...current, code: event.target.value.toLowerCase() }))} />
              </Field>
              <Field label="Ad">
                <Input value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label="Prefix">
                <Input value={categoryDraft.codePrefix ?? ''} onChange={(event) => setCategoryDraft((current) => ({ ...current, codePrefix: event.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Açıqlama">
                <Input value={categoryDraft.description ?? ''} onChange={(event) => setCategoryDraft((current) => ({ ...current, description: event.target.value }))} />
              </Field>
              <Field label="Dinamik sahələr">
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {availableDynamicFields.map((field) => (
                    <label key={field.key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={selectedDynamicFieldKeys.has(field.key)} onChange={() => toggleDynamicField(field)} />
                      {field.label}
                    </label>
                  ))}
                </div>
              </Field>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={categoryDraft.isActive ?? true} onChange={(event) => setCategoryDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                Aktiv kateqoriya
              </label>
              <div className="flex gap-2">
                <Button onClick={() => void saveCategory()} disabled={savingCategory}>
                  {savingCategory ? 'Saxlanılır...' : editingCategoryId ? 'Yenilə' : 'Yarat'}
                </Button>
                {editingCategoryId ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCategoryDraft(emptyCategory());
                    }}
                  >
                    Təmizlə
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Kateqoriyalar" description="Material bazasında görünəcək aktiv və passiv kateqoriyalar." />
            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <EntityRow
                  key={category.id}
                  title={category.name}
                  subtitle={(category.dynamicFields ?? []).map((field) => field.label).join(', ') || 'Dinamik sahə yoxdur'}
                  status={category.isActive !== false ? 'Aktiv' : 'Passiv'}
                  active={category.isActive !== false}
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setCategoryDraft({
                            code: category.code,
                            name: category.name,
                            codePrefix: category.codePrefix ?? '',
                            description: category.description ?? '',
                            isActive: category.isActive ?? true,
                            dynamicFields: category.dynamicFields ?? []
                          });
                        }}
                      >
                        Düzəliş
                      </Button>
                      <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => void toggleCategory(category, category.isActive === false)}>
                        {category.isActive === false ? 'Aktiv et' : 'Passiv et'}
                      </Button>
                      <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs text-rose-600" onClick={() => void deleteCategory(category.id)}>
                        Sil
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'references' ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
          <Card className="p-5">
            <SectionHeader title="Seçim siyahıları" description="Ödəniş, status və digər seçim siyahılarını buradan idarə edin." />
            <div className="mt-4 grid gap-3">
              <Field label="Siyahı qrupu">
                <select
                  value={selectedReferenceGroup}
                  onChange={(event) => {
                    setSelectedReferenceGroup(event.target.value);
                    setEditingReferenceId(null);
                    setReferenceDraft(emptyReference(event.target.value));
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  {referenceGroups.map((group) => (
                    <option key={group.key} value={group.key}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dəyər / key">
                <Input value={referenceDraft.value} onChange={(event) => setReferenceDraft((current) => ({ ...current, value: event.target.value }))} />
              </Field>
              <Field label="AZ başlıq">
                <Input value={referenceDraft.labelAz} onChange={(event) => setReferenceDraft((current) => ({ ...current, labelAz: event.target.value }))} />
              </Field>
              <Field label="RU başlıq">
                <Input value={referenceDraft.labelRu} onChange={(event) => setReferenceDraft((current) => ({ ...current, labelRu: event.target.value }))} />
              </Field>
              <Field label="Sıra">
                <Input
                  type="number"
                  value={referenceDraft.sortOrder ?? 0}
                  onChange={(event) => setReferenceDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))}
                />
              </Field>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={referenceDraft.isActive ?? true} onChange={(event) => setReferenceDraft((current) => ({ ...current, isActive: event.target.checked }))} />
                Aktiv element
              </label>
              <div className="flex gap-2">
                <Button onClick={() => void saveReference()} disabled={savingReference}>
                  {savingReference ? 'Saxlanılır...' : editingReferenceId ? 'Yenilə' : 'Əlavə et'}
                </Button>
                {editingReferenceId ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingReferenceId(null);
                      setReferenceDraft(emptyReference(selectedReferenceGroup));
                    }}
                  >
                    Təmizlə
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title={referenceGroups.find((group) => group.key === selectedReferenceGroup)?.label ?? 'Siyahı elementləri'} />
            <div className="mt-4 space-y-3">
              {currentReferenceItems.map((item) => (
                <EntityRow
                  key={item.id}
                  title={item.labelAz}
                  subtitle={`${item.labelRu} • ${item.value}`}
                  status={item.isActive ? 'Aktiv' : 'Passiv'}
                  active={item.isActive}
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          setEditingReferenceId(item.id);
                          setReferenceDraft({
                            groupKey: item.groupKey,
                            value: item.value,
                            labelAz: item.labelAz,
                            labelRu: item.labelRu,
                            sortOrder: item.sortOrder,
                            isActive: item.isActive
                          });
                        }}
                      >
                        Düzəliş
                      </Button>
                      <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => void toggleReference(item, !item.isActive)}>
                        {item.isActive ? 'Passiv et' : 'Aktiv et'}
                      </Button>
                      <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs text-rose-600" onClick={() => void deleteReference(item.id)}>
                        Sil
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EntityRow({
  title,
  subtitle,
  status,
  active,
  actions
}: {
  title: string;
  subtitle?: string;
  status: string;
  active: boolean;
  actions: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-950">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
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
