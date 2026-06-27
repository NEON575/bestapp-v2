import { useEffect, useState, type ReactNode } from 'react';
import { Button, Input } from '@bestapp/ui';
import { Plus, RefreshCw, Warehouse as WarehouseIcon } from 'lucide-react';
import type { WarehouseItem, WarehouseMovementItem, WarehouseStockLevelItem } from '@bestapp/shared';
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDate, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';
import { warehousesClient } from '../shared/api/warehouses';

type WarehouseTab = 'levels' | 'movements';

type WarehouseDraft = {
  code: string;
  name: string;
  description: string;
};

function emptyDraft(): WarehouseDraft {
  return {
    code: '',
    name: '',
    description: ''
  };
}

function movementTypeLabel(type: string) {
  switch (type) {
    case 'purchase_in':
      return 'Alış girişi';
    case 'write_off':
      return 'Silinmə';
    case 'reserve':
      return 'Rezerv';
    case 'return':
      return 'Qaytarma';
    case 'adjustment':
      return 'Düzəliş';
    case 'waste':
      return 'Fire';
    default:
      return type;
  }
}

function toWarehouseLabel(warehouse?: WarehouseItem | null) {
  if (!warehouse) {
    return '—';
  }

  return `${warehouse.code} · ${warehouse.name}`;
}

function normalizeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatUnits(value: number) {
  return new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 4 }).format(value);
}

function WarehouseTableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function WarehousePage() {
  const toast = useToast();
  const [tab, setTab] = useState<WarehouseTab>('levels');
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [levels, setLevels] = useState<WarehouseStockLevelItem[]>([]);
  const [movements, setMovements] = useState<WarehouseMovementItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<WarehouseDraft>(emptyDraft());

  const loadWarehouses = async () => {
    const data = await warehousesClient.list();
    setWarehouses(data);
    if (warehouseId !== 'all' && !data.some((warehouse) => warehouse.id === warehouseId) && data[0]) {
      setWarehouseId(data[0].id);
    }
    return data;
  };

  const loadCurrentTab = async (nextPage = page, nextSearch = search, nextWarehouseId = warehouseId) => {
    setLoading(true);
    setError(null);

    try {
      const filterWarehouseId = nextWarehouseId === 'all' ? undefined : nextWarehouseId;
      if (tab === 'levels') {
        const response = await warehousesClient.levels({
          page: nextPage,
          limit,
          search: nextSearch || undefined,
          warehouseId: filterWarehouseId
        });
        setLevels(response.data);
        setMovements([]);
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      } else {
        const response = await warehousesClient.movements({
          page: nextPage,
          limit,
          search: nextSearch || undefined,
          warehouseId: filterWarehouseId
        });
        setMovements(response.data);
        setLevels([]);
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Anbar məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadWarehouses();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Anbar siyahısı yüklənmədi');
      }
    })();
  }, []);

  useEffect(() => {
    void loadCurrentTab(page, search, warehouseId);
  }, [tab, page, search, warehouseId]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setDraft(emptyDraft());
  };

  const saveWarehouse = async () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.warning('Anbar kodu və adı tələb olunur');
      return;
    }

    setSaving(true);
    try {
      await warehousesClient.create({
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        description: draft.description.trim() || undefined
      });
      toast.success('Anbar yaradıldı');
      closeCreate();
      const data = await loadWarehouses();
      await loadCurrentTab(1, search, warehouseId);
    } catch (saveError) {
      toast.error('Anbar yaradılmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    const data = await loadWarehouses();
    const nextWarehouseId = warehouseId === 'all' && data[0] ? data[0].id : warehouseId;
    await loadCurrentTab(page, search, nextWarehouseId);
  };

  const filteredLevels = levels;
  const filteredMovements = movements;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anbar"
        description="Qalıqları və hərəkətləri burada izləyin."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Yenilə
              </span>
            </Button>
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni anbar
              </span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setTab('levels');
            setPage(1);
          }}
          className={[
            'rounded-2xl px-4 py-2 text-sm font-medium transition',
            tab === 'levels' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          ].join(' ')}
        >
          Qalıqlar
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('movements');
            setPage(1);
          }}
          className={[
            'rounded-2xl px-4 py-2 text-sm font-medium transition',
            tab === 'movements' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          ].join(' ')}
        >
          Hərəkətlər
        </button>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
        <label className="block space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Axtarış</span>
          <Input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Material, anbar və ya referans"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Anbar</span>
          <select
            value={warehouseId}
            onChange={(event) => {
              setPage(1);
              setWarehouseId(event.target.value);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
          >
            <option value="all">Hamısı</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} · {warehouse.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState title="Anbar məlumatları yüklənmədi" description={error} onRetry={() => void loadCurrentTab(page, search, warehouseId)} />
      ) : tab === 'levels' ? (
        filteredLevels.length === 0 ? (
          <EmptyState
            title="Qalıq tapılmadı"
            description="Hələ heç bir material anbara daxil edilməyib."
            icon={WarehouseIcon}
            actionLabel="Yenilə"
            onAction={() => void refresh()}
          />
        ) : (
          <div className="space-y-4">
            <WarehouseTableWrapper>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Material №', 'Material adı', 'Kateqoriya', 'Anbar', 'Qalıq', 'Rezerv', 'Mövcud', 'Yenilənmə'].map((header) => (
                      <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLevels.map((level) => (
                    <tr key={level.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-950">{level.material?.materialNo ?? '—'}</td>
                      <td className="px-4 py-3">{level.material?.name ?? '—'}</td>
                      <td className="px-4 py-3">{level.material?.category?.name ?? '—'}</td>
                      <td className="px-4 py-3">{toWarehouseLabel(level.warehouse)}</td>
                      <td className="px-4 py-3">{formatUnits(normalizeNumber(level.onHand))}</td>
                      <td className="px-4 py-3">{formatUnits(normalizeNumber(level.reserved))}</td>
                      <td className="px-4 py-3">{formatUnits(normalizeNumber(level.available))}</td>
                      <td className="px-4 py-3">{formatDate(level.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WarehouseTableWrapper>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <div className="text-sm text-slate-500">Cəmi {totalItems} qeyd</div>
          </div>
        )
      ) : filteredMovements.length === 0 ? (
        <EmptyState
          title="Hərəkət tapılmadı"
          description="Hələ heç bir stock hərəkəti yoxdur."
          icon={WarehouseIcon}
          actionLabel="Yenilə"
          onAction={() => void refresh()}
        />
      ) : (
        <div className="space-y-4">
          <WarehouseTableWrapper>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Tarix', 'Material', 'Anbar', 'Əməliyyat', 'Miqdar', 'Vahid maya', 'Cəmi dəyər', 'Referans', 'Qeyd'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3">{formatDate(movement.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{movement.material?.name ?? '—'}</div>
                      <div className="text-xs text-slate-500">{movement.material?.materialNo ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">{toWarehouseLabel(movement.warehouse)}</td>
                    <td className="px-4 py-3">{movementTypeLabel(movement.type)}</td>
                    <td className="px-4 py-3">{formatNumber(movement.quantity, 4)}</td>
                    <td className="px-4 py-3">{formatCurrency(movement.unitCost ?? 0, 'AZN')}</td>
                    <td className="px-4 py-3">{formatCurrency(movement.totalCost ?? 0, 'AZN')}</td>
                    <td className="px-4 py-3">{movement.reference ?? '—'}</td>
                    <td className="px-4 py-3">{movement.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WarehouseTableWrapper>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <div className="text-sm text-slate-500">Cəmi {totalItems} qeyd</div>
        </div>
      )}

      <Modal
        open={createOpen}
        title="Yeni anbar"
        description="Sadə anbar kartı yaradın."
        onClose={closeCreate}
        widthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Kod</span>
            <Input
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              placeholder="Məsələn: AUX-01"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Ad</span>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Anbar adı"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Qeyd</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={closeCreate} disabled={saving}>
              Bağla
            </Button>
            <Button onClick={() => void saveWarehouse()} disabled={saving}>
              {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
