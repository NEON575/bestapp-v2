import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
  CompanySettings,
  CreateEmployeeDto,
  CreateMaterialCategoryDto,
  EmployeeItem,
  MaterialCategoryItem,
  MaterialDynamicField,
  SettingsReferenceOptions
} from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { salariesClient } from '../shared/api/salaries';
import { settingsClient } from '../shared/api/settings';
import { ErrorState, LoadingState, PageHeader } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';

const availableDynamicFields: MaterialDynamicField[] = [
  { key: 'type', label: 'Tip', type: 'text' },
  { key: 'gram', label: 'Qram', type: 'number' },
  { key: 'sheetCount', label: 'List sayı / bağlama', type: 'number' },
  { key: 'spiralSize', label: 'Spiral ölçüsü', type: 'text' },
  {
    key: 'color',
    label: 'Rəng',
    type: 'select',
    options: [
      { label: 'Cyan', value: 'cyan' },
      { label: 'Magenta', value: 'magenta' },
      { label: 'Yellow', value: 'yellow' },
      { label: 'Black', value: 'black' },
      { label: 'Pantone', value: 'pantone' },
      { label: 'Digər', value: 'other' }
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
    dynamicFields: []
  };
}

export function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanySettings>(emptyCompany());
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [employeeDraft, setEmployeeDraft] = useState<CreateEmployeeDto>(emptyEmployee());
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<CreateMaterialCategoryDto>(emptyCategory());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [referenceOptions, setReferenceOptions] = useState<SettingsReferenceOptions | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [companyResponse, employeesResponse, categoriesResponse, referencesResponse] = await Promise.all([
        settingsClient.company(),
        salariesClient.listEmployees(),
        inventoryClient.categories(),
        settingsClient.referenceOptions()
      ]);

      setCompany({ ...emptyCompany(), ...companyResponse });
      setEmployees(employeesResponse);
      setCategories(categoriesResponse);
      setReferenceOptions(referencesResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Ayarlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

  const createEmployee = async () => {
    if (!employeeDraft.fullName.trim()) {
      toast.warning('İşçi adı vacibdir');
      return;
    }

    setSavingEmployee(true);
    try {
      await salariesClient.createEmployee(employeeDraft);
      setEmployeeDraft(emptyEmployee());
      await load();
      toast.success('İşçi əlavə olundu');
    } catch (saveError) {
      toast.error('İşçi əlavə olunmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingEmployee(false);
    }
  };

  const createCategory = async () => {
    if (!categoryDraft.name.trim() || !categoryDraft.code.trim()) {
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

  const deactivateCategory = async (id: string) => {
    try {
      await inventoryClient.removeCategory(id);
      await load();
      toast.success('Kateqoriya passivləşdirildi');
    } catch (saveError) {
      toast.error('Kateqoriya passivləşdirilmədi', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
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

  if (loading) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Ayarlar" description="Şirkət məlumatları, işçilər və material kateqoriyaları burada idarə olunur." />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Şirkət məlumatları</h2>
              <p className="text-sm text-slate-500">Qaimə, invoice və PDF sənədlər üçün əsas məlumatlar.</p>
            </div>
            <Button onClick={() => void saveCompany()} disabled={savingCompany}>
              {savingCompany ? 'Saxlanılır...' : 'Yadda saxla'}
            </Button>
          </div>

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

        <div className="space-y-5">
          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">İşçilər</h2>
            <p className="mt-1 text-sm text-slate-500">Menecer, maaş və istehsal cavabdehləri üçün vahid siyahı.</p>

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
                  <option value="production">Dizayner / istehsal</option>
                  <option value="accountant">Mühasib</option>
                  <option value="warehouse">Anbar</option>
                  <option value="other">Digər</option>
                </select>
              </Field>
              <Field label="Qeyd">
                <Input value={employeeDraft.notes ?? ''} onChange={(event) => setEmployeeDraft((current) => ({ ...current, notes: event.target.value }))} />
              </Field>
              <Button onClick={() => void createEmployee()} disabled={savingEmployee}>
                {savingEmployee ? 'Əlavə olunur...' : 'İşçi əlavə et'}
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              {employees.map((employee) => (
                <div key={employee.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="font-medium text-slate-950">{employee.fullName}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {[employee.title, employee.roleKey, employee.phone].filter(Boolean).join(' • ') || 'Məlumat yoxdur'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Material kateqoriyaları</h2>
            <p className="mt-1 text-sm text-slate-500">Avtomatik kod prefix və dinamik sahələr buradan idarə olunur.</p>

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
                      <input
                        type="checkbox"
                        checked={selectedDynamicFieldKeys.has(field.key)}
                        onChange={() => toggleDynamicField(field)}
                      />
                      {field.label}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="flex gap-2">
                <Button onClick={() => void createCategory()} disabled={savingCategory}>
                  {savingCategory ? 'Saxlanılır...' : editingCategoryId ? 'Kateqoriyanı yenilə' : 'Kateqoriya yarat'}
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

            <div className="mt-5 space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{category.name}</div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {category.codePrefix ?? category.code}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {(category.dynamicFields ?? []).map((field) => field.label).join(', ') || 'Dinamik sahə yoxdur'}
                  </div>
                  <div className="mt-3 flex gap-2">
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
                          dynamicFields: category.dynamicFields ?? []
                        });
                      }}
                    >
                      Düzəliş
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-8 rounded-lg px-3 text-xs text-rose-600"
                      onClick={() => void deactivateCategory(category.id)}
                    >
                      Passiv et
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Sistem istinadları</h2>
        <p className="mt-1 text-sm text-slate-500">Hazırkı seçimlər frontend və import mapping üçün istifadə olunur.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReferenceBlock title="Ödəniş növləri" items={referenceOptions?.paymentTypes ?? []} />
          <ReferenceBlock title="Statuslar" items={referenceOptions?.orderStatuses ?? []} />
          <ReferenceBlock title="Qaimə statusları" items={referenceOptions?.qaimaStatuses ?? []} />
          <ReferenceBlock title="İstehsal mərhələləri" items={referenceOptions?.productionStages ?? []} />
        </div>
      </Card>
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

function ReferenceBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
