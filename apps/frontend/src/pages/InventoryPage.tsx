import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
  CreateStockMovementDto,
  InventoryMaterialDetail,
  InventoryMaterialItem,
  InventoryMovementItem,
  InventorySummary,
  MaterialCategoryItem,
  MaterialQueryDto,
  StockReservationItem,
  WarehouseItem
} from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type InventoryTab = 'balances' | 'movements';
type InventoryStockFilter = 'all' | 'low' | 'zero' | 'positive';
type InventoryActionType = 'purchase_in' | 'write_off' | 'adjustment' | 'reserve' | 'release_reserve' | 'waste';

type MovementDraft = {
  date: string;
  materialId: string;
  warehouseId: string;
  type: InventoryActionType;
  quantity: string;
  reservationId: string;
  orderId: string;
  reason: string;
  note: string;
  direction: 'increase' | 'decrease';
};

const actionLabels: Record<InventoryActionType, string> = {
  purchase_in: 'Giriş',
  write_off: 'Çıxış',
  adjustment: 'Düzəliş',
  reserve: 'Rezerv',
  release_reserve: 'Rezervdən çıxar',
  waste: 'Fire / zay'
};

const movementBadgeClasses: Record<string, string> = {
  purchase_in: 'bg-emerald-50 text-emerald-700',
  write_off: 'bg-rose-50 text-rose-700',
  adjustment: 'bg-sky-50 text-sky-700',
  reserve: 'bg-amber-50 text-amber-700',
  waste: 'bg-slate-100 text-slate-700',
  return: 'bg-emerald-50 text-emerald-700'
};

function emptyMovementDraft(defaultWarehouseId = ''): MovementDraft {
  return {
    date: new Date().toISOString().slice(0, 10),
    materialId: '',
    warehouseId: defaultWarehouseId,
    type: 'purchase_in',
    quantity: '',
    reservationId: '',
    orderId: '',
    reason: '',
    note: '',
    direction: 'increase'
  };
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function resolveStockFilter(filter: InventoryStockFilter) {
  switch (filter) {
    case 'low':
      return { lowStockOnly: true, stockState: undefined };
    case 'zero':
      return { lowStockOnly: false, stockState: 'zero' as const };
    case 'positive':
      return { lowStockOnly: false, stockState: 'positive' as const };
    default:
      return { lowStockOnly: false, stockState: undefined };
  }
}

function getMaterialStatus(material: InventoryMaterialItem) {
  const onHand = Number(material.onHand ?? 0);
  const available = Number(material.available ?? 0);
  const minimum = Number(material.minStockLevel ?? 0);

  if (onHand === 0) {
    return {
      label: 'Qalıq yoxdur',
      rowClass: 'bg-slate-50/70',
      badgeClass: 'bg-slate-100 text-slate-700'
    };
  }

  if (available <= minimum) {
    return {
      label: 'Az qalıb',
      rowClass: 'bg-amber-50/50',
      badgeClass: 'bg-amber-100 text-amber-800'
    };
  }

  return {
    label: 'Normal',
    rowClass: '',
    badgeClass: 'bg-emerald-50 text-emerald-700'
  };
}

function getMovementTypeLabel(movement: InventoryMovementItem) {
  return movement.displayType ?? actionLabels[movement.type as InventoryActionType] ?? movement.type;
}

export function InventoryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<InventoryTab>('balances');
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>('all');
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [reservations, setReservations] = useState<StockReservationItem[]>([]);
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<MaterialQueryDto>({
    page: 1,
    limit: 20,
    search: '',
    categoryId: '',
    lowStockOnly: false,
    stockState: undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [movementSearch, setMovementSearch] = useState('');
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementDraft, setMovementDraft] = useState<MovementDraft>(emptyMovementDraft());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMaterial, setDetailMaterial] = useState<InventoryMaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, materialsResponse, movementsResponse, categoriesResponse, warehousesResponse, reservationsResponse] = await Promise.all([
        inventoryClient.summary(),
        inventoryClient.materials(nextQuery),
        inventoryClient.movements({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
        inventoryClient.categories(),
        inventoryClient.warehouses(),
        inventoryClient.reservations({ activeOnly: true })
      ]);

      setSummary(summaryResponse);
      setMaterials(materialsResponse.data);
      setMeta(materialsResponse.meta);
      setMovements(movementsResponse.data);
      setCategories(categoriesResponse);
      setWarehouses(warehousesResponse);
      setReservations(reservationsResponse);
      setMovementDraft((current) => ({
        ...current,
        warehouseId: current.warehouseId || warehousesResponse[0]?.id || ''
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Anbar məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.categoryId, query.lowStockOnly, query.stockState]);

  const filteredMovements = useMemo(() => {
    const normalizedSearch = movementSearch.trim().toLowerCase();
    return movements.filter((movement) => {
      if (!normalizedSearch) return true;
      const haystack = [
        movement.material?.name,
        movement.reference,
        movement.note,
        movement.purchaseEntry?.supplier?.name,
        movement.order?.number
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [movementSearch, movements]);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === movementDraft.materialId) ?? null,
    [materials, movementDraft.materialId]
  );

  const availableReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          (!movementDraft.materialId || reservation.material?.id === movementDraft.materialId) &&
          (!movementDraft.warehouseId || reservation.warehouse?.id === movementDraft.warehouseId)
      ),
    [movementDraft.materialId, movementDraft.warehouseId, reservations]
  );

  const openMovementModal = (type: InventoryActionType) => {
    setMovementDraft((current) => ({
      ...emptyMovementDraft(warehouses[0]?.id ?? ''),
      type
    }));
    setMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    setMovementModalOpen(false);
    setMovementDraft(emptyMovementDraft(warehouses[0]?.id ?? ''));
  };

  const loadMaterialDetail = async (materialId: string) => {
    setDetailLoading(true);
    try {
      const detail = await inventoryClient.material(materialId);
      setDetailMaterial(detail);
      setDetailOpen(true);
    } catch (detailError) {
      toast.error('Material açılmadı', detailError instanceof Error ? detailError.message : 'Xəta baş verdi');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const date = toIsoDate(movementDraft.date);
      const quantity = Math.abs(toNumber(movementDraft.quantity));

      if (!movementDraft.materialId) {
        throw new Error('Material seçin');
      }

      if (movementDraft.type === 'reserve') {
        if (!movementDraft.orderId) {
          throw new Error('Rezerv üçün əlaqəli sifariş seçilməlidir');
        }

        await inventoryClient.reserve({
          orderId: movementDraft.orderId,
          materialId: movementDraft.materialId,
          warehouseId: movementDraft.warehouseId,
          quantity,
          note: movementDraft.note || movementDraft.reason || undefined,
          date
        });
      } else if (movementDraft.type === 'release_reserve') {
        if (!movementDraft.reservationId) {
          throw new Error('Aktiv rezerv seçin');
        }
        await inventoryClient.releaseReservation(movementDraft.reservationId);
      } else if (movementDraft.type === 'write_off') {
        await inventoryClient.writeOff({
          materialId: movementDraft.materialId,
          warehouseId: movementDraft.warehouseId || undefined,
          orderId: movementDraft.orderId || undefined,
          quantity,
          note: movementDraft.note || movementDraft.reason || undefined,
          date
        });
      } else {
        const payload: CreateStockMovementDto = {
          materialId: movementDraft.materialId,
          warehouseId: movementDraft.warehouseId || undefined,
          orderId: movementDraft.orderId || undefined,
          type: movementDraft.type === 'purchase_in' ? 'purchase_in' : movementDraft.type,
          quantity:
            movementDraft.type === 'adjustment'
              ? movementDraft.direction === 'decrease'
                ? -quantity
                : quantity
              : quantity,
          reference: movementDraft.reason || undefined,
          note: movementDraft.note || undefined,
          date
        };
        await inventoryClient.createMovement(payload);
      }

      toast.success('Anbar əməliyyatı saxlanıldı');
      closeMovementModal();
      await load(query);
    } catch (saveError) {
      toast.error('Anbar əməliyyatı saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return <LoadingState rows={6} />;
  }

  if (error && !summary) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Anbar"
        description="Material qalıqları və anbar hərəkətləri burada aydın şəkildə izlənir."
        actions={
          tab === 'balances' ? (
            <Button onClick={() => setTab('movements')}>Hərəkətlərə keç</Button>
          ) : (
            <Button onClick={() => openMovementModal('purchase_in')}>Yeni hərəkət</Button>
          )
        }
      />

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <div className="flex flex-wrap gap-2">
        {[
          ['balances', 'Qalıqlar'],
          ['movements', 'Hərəkətlər']
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as InventoryTab)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              tab === key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'balances' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Material sayı" value={String(summary?.totalMaterials ?? 0)} />
            <SummaryCard label="Az qalanlar" value={String(summary?.lowStockCount ?? 0)} tone="warning" />
            <SummaryCard label="Ümumi stok dəyəri" value={formatCurrency(summary?.totalStockValue)} tone="success" />
            <SummaryCard label="Rezerv dəyəri" value={formatCurrency(summary?.reservedValue)} />
            <SummaryCard label="Son hərəkətlər" value={String(summary?.recentMovements.length ?? 0)} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-4">
              <Field label="Axtarış">
                <Input value={query.search ?? ''} onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Material və ya kod" />
              </Field>
              <Field label="Kateqoriya">
                <select value={query.categoryId ?? ''} onChange={(event) => setQuery((current) => ({ ...current, categoryId: event.target.value, page: 1 }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="">Bütün kateqoriyalar</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Görünüş">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'Bütün materiallar'],
                    ['low', 'Az qalanlar'],
                    ['zero', 'Qalıq 0 olanlar'],
                    ['positive', 'Qalıq olanlar']
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setStockFilter(value as InventoryStockFilter);
                        const next = resolveStockFilter(value as InventoryStockFilter);
                        setQuery((current) => ({
                          ...current,
                          ...next,
                          page: 1
                        }));
                      }}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        stockFilter === value ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Material', 'Kateqoriya', 'Vahid', 'Qalıq', 'Rezerv', 'Mövcud', 'Minimum qalıq', 'Son alış qiyməti', 'Orta qiymət', 'Status'].map((header) => (
                      <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials.length ? (
                    materials.map((material) => {
                      const status = getMaterialStatus(material);
                      return (
                        <tr key={material.id} className={`border-b border-slate-100 ${status.rowClass}`}>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => void loadMaterialDetail(material.id)} className="text-left">
                              <div className="font-medium text-slate-950 hover:text-slate-700">{material.name}</div>
                              <div className="text-xs text-slate-500">{material.sku ?? 'Kod yoxdur'}</div>
                            </button>
                          </td>
                          <td className="px-4 py-3">{material.category?.name ?? '—'}</td>
                          <td className="px-4 py-3">{material.stockUnit ?? material.unit}</td>
                          <td className="px-4 py-3">{formatNumber(material.onHand)}</td>
                          <td className="px-4 py-3">{formatNumber(material.reserved)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-950">{formatNumber(material.available)}</td>
                          <td className="px-4 py-3">{formatNumber(material.minStockLevel)}</td>
                          <td className="px-4 py-3">{formatCurrency(material.lastPurchasePrice)}</td>
                          <td className="px-4 py-3">{formatCurrency(material.averageCost)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}>{status.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8">
                        <EmptyState title="Material tapılmadı" description="Filtrləri dəyişin və ya Alış bölməsindən material üçün giriş yaradın." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />
        </>
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr,auto]">
              <Field label="Axtarış">
                <Input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Material, təchizatçı, qeyd, istinad" />
              </Field>
              <div className="flex items-end gap-2">
                {([
                  'purchase_in',
                  'write_off',
                  'adjustment',
                  'reserve',
                  'release_reserve',
                  'waste'
                ] as InventoryActionType[]).map((type) => (
                  <Button key={type} variant="secondary" onClick={() => openMovementModal(type)}>
                    {actionLabels[type]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Tarix', 'Material', 'Hərəkət', 'Miqdar', 'Səbəb / istinad', 'Əlaqəli sifariş', 'Qiymət', 'Təchizatçı', 'Qeyd'].map((header) => (
                      <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length ? (
                    filteredMovements.map((movement) => (
                      <tr key={movement.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">{movement.createdAt ? formatDateOnly(movement.createdAt) : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">{movement.material?.name ?? '—'}</div>
                          <div className="text-xs text-slate-500">{movement.material?.sku ?? 'Kod yoxdur'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${movementBadgeClasses[movement.type] ?? 'bg-slate-100 text-slate-700'}`}>
                            {getMovementTypeLabel(movement)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-semibold ${Number(movement.balanceDelta ?? movement.quantity) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatNumber(movement.balanceDelta ?? movement.quantity)}
                        </td>
                        <td className="px-4 py-3">
                          <div>{movement.reference ?? '—'}</div>
                          {movement.purchaseEntry?.id ? <div className="text-xs text-slate-500">Alış: {movement.purchaseEntry.id.slice(0, 8)}</div> : null}
                        </td>
                        <td className="px-4 py-3">{movement.order?.number ?? '—'}</td>
                        <td className="px-4 py-3">
                          {movement.unitCost != null ? formatCurrency(movement.unitCost) : '—'}
                          {movement.totalCost != null ? <div className="text-xs text-slate-500">{formatCurrency(movement.totalCost)}</div> : null}
                        </td>
                        <td className="px-4 py-3">{movement.purchaseEntry?.supplier?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{movement.note ?? '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8">
                        <EmptyState title="Hərəkət yoxdur" description="İlk əməliyyatdan sonra jurnal burada görünəcək." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={movementModalOpen}
        title={actionLabels[movementDraft.type]}
        description="Tarix, material, miqdar və səbəbi qeyd edin. Sistem qalıq və rezervləri avtomatik yeniləyəcək."
        onClose={closeMovementModal}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMovement}>
          <Field label="Tarix">
            <Input type="date" value={movementDraft.date} onChange={(event) => setMovementDraft((current) => ({ ...current, date: event.target.value }))} />
          </Field>

          <Field label="Hərəkət növü">
            <Input value={actionLabels[movementDraft.type]} readOnly />
          </Field>

          <Field label="Material" className="md:col-span-2">
            <select value={movementDraft.materialId} onChange={(event) => setMovementDraft((current) => ({ ...current, materialId: event.target.value, reservationId: '' }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" required>
              <option value="">Material seçin</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Anbar">
            <select value={movementDraft.warehouseId} onChange={(event) => setMovementDraft((current) => ({ ...current, warehouseId: event.target.value, reservationId: '' }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" required>
              <option value="">Anbar seçin</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Vahid">
            <Input value={selectedMaterial?.stockUnit ?? selectedMaterial?.unit ?? '—'} readOnly />
          </Field>

          {movementDraft.type === 'release_reserve' ? (
            <Field label="Aktiv rezerv" className="md:col-span-2">
              <select value={movementDraft.reservationId} onChange={(event) => {
                const reservation = availableReservations.find((item) => item.id === event.target.value);
                setMovementDraft((current) => ({
                  ...current,
                  reservationId: event.target.value,
                  quantity: reservation ? String(reservation.quantity) : current.quantity,
                  orderId: reservation?.order?.id ?? current.orderId
                }));
              }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" required>
                <option value="">Rezerv seçin</option>
                {availableReservations.map((reservation) => (
                  <option key={reservation.id} value={reservation.id}>
                    {(reservation.order?.number ?? 'Sifarişsiz')} • {reservation.material?.name ?? ''} • {formatNumber(reservation.quantity)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Miqdar">
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={movementDraft.quantity}
              onChange={(event) => setMovementDraft((current) => ({ ...current, quantity: event.target.value }))}
              readOnly={movementDraft.type === 'release_reserve'}
              required
            />
          </Field>

          {movementDraft.type === 'adjustment' ? (
            <Field label="İstiqamət">
              <select value={movementDraft.direction} onChange={(event) => setMovementDraft((current) => ({ ...current, direction: event.target.value as MovementDraft['direction'] }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                <option value="increase">Artır</option>
                <option value="decrease">Azalt</option>
              </select>
            </Field>
          ) : null}

          {movementDraft.type === 'reserve' || movementDraft.type === 'write_off' ? (
            <Field label="Əlaqəli sifariş">
              <Input value={movementDraft.orderId} onChange={(event) => setMovementDraft((current) => ({ ...current, orderId: event.target.value }))} placeholder="Sifariş ID və ya nömrə" />
            </Field>
          ) : null}

          <Field label="Səbəb">
            <Input value={movementDraft.reason} onChange={(event) => setMovementDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="Məs: daxili istifadə, inventar, düzəliş" />
          </Field>

          <Field label="Qeyd" className="md:col-span-2">
            <Input value={movementDraft.note} onChange={(event) => setMovementDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Əlavə qeyd" />
          </Field>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeMovementModal}>
              Bağla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saxlanılır...' : 'Yadda saxla'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailOpen}
        title={detailMaterial?.name ?? 'Material'}
        description="Material məlumatları, son hərəkətlər və qiymət tarixçəsi."
        widthClassName="max-w-4xl"
        onClose={() => {
          setDetailOpen(false);
          setDetailMaterial(null);
        }}
      >
        {detailLoading || !detailMaterial ? (
          <LoadingState rows={4} />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <DetailBox label="Qalıq" value={formatNumber(detailMaterial.onHand)} />
              <DetailBox label="Rezerv" value={formatNumber(detailMaterial.reserved)} />
              <DetailBox label="Mövcud" value={formatNumber(detailMaterial.available)} />
              <DetailBox label="Stok dəyəri" value={formatCurrency(detailMaterial.stockValue)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailField label="Kateqoriya" value={detailMaterial.category?.name ?? '—'} />
              <DetailField label="Vahid" value={detailMaterial.stockUnit ?? detailMaterial.unit} />
              <DetailField label="Son alış qiyməti" value={formatCurrency(detailMaterial.lastPurchasePrice)} />
              <DetailField label="Orta qiymət" value={formatCurrency(detailMaterial.averageCost)} />
              <DetailField label="Son hərəkət tarixi" value={detailMaterial.lastMovementAt ? formatDateOnly(detailMaterial.lastMovementAt) : '—'} />
              <DetailField label="Son alış tarixi" value={detailMaterial.lastPurchaseAt ? formatDateOnly(detailMaterial.lastPurchaseAt) : '—'} />
              <DetailField label="Qeyd" value={detailMaterial.notes ?? '—'} className="md:col-span-2" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-950">Anbar üzrə qalıqlar</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {['Anbar', 'Qalıq', 'Rezerv', 'Mövcud'].map((header) => (
                        <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detailMaterial.stockLevels ?? []).map((level, index) => (
                      <tr key={`${level.warehouse?.id ?? 'warehouse'}-${index}`} className="border-b border-slate-100">
                        <td className="px-4 py-3">{level.warehouse?.name ?? '—'}</td>
                        <td className="px-4 py-3">{formatNumber(level.onHand)}</td>
                        <td className="px-4 py-3">{formatNumber(level.reserved)}</td>
                        <td className="px-4 py-3">{formatNumber(level.available)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-950">Son 10 hərəkət</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {['Tarix', 'Hərəkət', 'Miqdar', 'İstinad', 'Təchizatçı', 'Qeyd'].map((header) => (
                        <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detailMaterial.recentMovements ?? []).map((movement) => (
                      <tr key={movement.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">{movement.createdAt ? formatDateOnly(movement.createdAt) : '—'}</td>
                        <td className="px-4 py-3">{getMovementTypeLabel(movement)}</td>
                        <td className="px-4 py-3">{formatNumber(movement.balanceDelta ?? movement.quantity)}</td>
                        <td className="px-4 py-3">{movement.reference ?? '—'}</td>
                        <td className="px-4 py-3">{movement.purchaseEntry?.supplier?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{movement.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: 'warning' | 'success';
}) {
  const colorClass = tone === 'warning' ? 'text-amber-700' : tone === 'success' ? 'text-emerald-700' : 'text-slate-950';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

function InlineAlert({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{children}</div>;
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

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function DetailField({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-950">{value}</div>
    </div>
  );
}
