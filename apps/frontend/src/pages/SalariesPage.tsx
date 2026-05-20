import { useEffect, useState } from 'react';
import type { EmployeeItem, SalaryEntryItem, SalaryTotalsSummary } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { salariesClient } from '../shared/api/salaries';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  SearchInput,
  StatCard
} from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type SalaryForm = {
  employeeId: string;
  salaryAmount: number;
  bonusAmount: number;
  paymentAmount: number;
  comment: string;
};

type EmployeeForm = {
  fullName: string;
  title: string;
  phone: string;
};

const initialSalaryForm: SalaryForm = {
  employeeId: '',
  salaryAmount: 0,
  bonusAmount: 0,
  paymentAmount: 0,
  comment: ''
};

const initialEmployeeForm: EmployeeForm = {
  fullName: '',
  title: '',
  phone: ''
};

export function SalariesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<SalaryEntryItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [summary, setSummary] = useState<SalaryTotalsSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState<SalaryForm>(initialSalaryForm);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(initialEmployeeForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salaryList, employeeList, totals] = await Promise.all([
        salariesClient.list({ page: 1, limit: 200, search }),
        salariesClient.listEmployees(),
        salariesClient.summary()
      ]);

      setRows(salaryList.data);
      setEmployees(employeeList);
      setSummary(totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Maaş məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search]);

  const submitEmployee = async () => {
    if (!employeeForm.fullName.trim()) {
      toast.error('İşçi adı vacibdir');
      return;
    }

    setSaving(true);
    try {
      await salariesClient.createEmployee({
        fullName: employeeForm.fullName,
        title: employeeForm.title || undefined,
        phone: employeeForm.phone || undefined
      });
      toast.success('İşçi əlavə olundu');
      setEmployeeModalOpen(false);
      setEmployeeForm(initialEmployeeForm);
      await load();
    } catch (e) {
      toast.error('İşçi əlavə olunmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const submitSalary = async () => {
    if (!salaryForm.employeeId || salaryForm.salaryAmount <= 0) {
      toast.error('İşçi və maaş məbləği vacibdir');
      return;
    }

    setSaving(true);
    try {
      await salariesClient.create({
        employeeId: salaryForm.employeeId,
        salaryAmount: salaryForm.salaryAmount,
        bonusAmount: salaryForm.bonusAmount,
        paymentAmount: salaryForm.paymentAmount,
        comment: salaryForm.comment
      });
      toast.success('Maaş qeydi əlavə olundu');
      setSalaryModalOpen(false);
      setSalaryForm(initialSalaryForm);
      await load();
    } catch (e) {
      toast.error('Maaş qeydi əlavə olunmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maaş"
        description="İşçilər üzrə maaş, bonus, ödəniş və qalıq."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEmployeeModalOpen(true)}>
              İşçi əlavə et
            </Button>
            <Button onClick={() => setSalaryModalOpen(true)}>Maaş əlavə et</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Maaş hesablanıb" value={formatCurrency(summary?.totalSalaryAmount)} />
        <StatCard label="Bonus" value={formatCurrency(summary?.totalBonusAmount)} accent="sky" />
        <StatCard label="Ödənilib" value={formatCurrency(summary?.totalPaymentAmount)} accent="emerald" />
        <StatCard label="Qalıq" value={formatCurrency(summary?.totalRemainingDebt)} accent="amber" />
      </div>

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="İşçi və ya qeyd üzrə axtarış" />
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          { key: 'date', header: 'Tarix', render: (row) => formatDateOnly(row.date) },
          { key: 'employee', header: 'Ad', render: (row) => row.employee?.fullName ?? '—' },
          { key: 'salary', header: 'Maaş', render: (row) => formatCurrency(row.salaryAmount) },
          { key: 'bonus', header: 'Bonus', render: (row) => formatCurrency(row.bonusAmount) },
          { key: 'payment', header: 'Ödəniş', render: (row) => formatCurrency(row.paymentAmount) },
          { key: 'debt', header: 'Qalıq', render: (row) => formatCurrency(row.remainingDebt) },
          { key: 'comment', header: 'Qeyd', render: (row) => row.comment ?? '—' }
        ]}
        emptyState={<EmptyState title="Maaş qeydi yoxdur" description="İlk maaş qeydi əlavə olunandan sonra cədvəl burada görünəcək." />}
      />

      <Modal open={employeeModalOpen} title="İşçi əlavə et" onClose={() => setEmployeeModalOpen(false)} widthClassName="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ad</label>
            <Input value={employeeForm.fullName} onChange={(event) => setEmployeeForm((current) => ({ ...current, fullName: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vəzifə</label>
            <Input value={employeeForm.title} onChange={(event) => setEmployeeForm((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefon</label>
            <Input value={employeeForm.phone} onChange={(event) => setEmployeeForm((current) => ({ ...current, phone: event.target.value }))} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEmployeeModalOpen(false)}>
            Bağla
          </Button>
          <Button onClick={() => void submitEmployee()} disabled={saving}>
            {saving ? 'Yazılır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>

      <Modal open={salaryModalOpen} title="Maaş əlavə et" onClose={() => setSalaryModalOpen(false)} widthClassName="max-w-xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">İşçi</label>
            <select
              value={salaryForm.employeeId}
              onChange={(event) => setSalaryForm((current) => ({ ...current, employeeId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">Seçin</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Maaş</label>
            <Input type="number" value={salaryForm.salaryAmount} onChange={(event) => setSalaryForm((current) => ({ ...current, salaryAmount: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bonus</label>
            <Input type="number" value={salaryForm.bonusAmount} onChange={(event) => setSalaryForm((current) => ({ ...current, bonusAmount: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ödəniş</label>
            <Input type="number" value={salaryForm.paymentAmount} onChange={(event) => setSalaryForm((current) => ({ ...current, paymentAmount: Number(event.target.value) }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Qeyd</label>
            <textarea
              value={salaryForm.comment}
              onChange={(event) => setSalaryForm((current) => ({ ...current, comment: event.target.value }))}
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSalaryModalOpen(false)}>
            Bağla
          </Button>
          <Button onClick={() => void submitSalary()} disabled={saving}>
            {saving ? 'Yazılır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

