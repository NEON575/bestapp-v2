import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, FileText, Layers3, Plus, Printer, Save, Scissors, Sparkles, Trash2, Truck, Wrench } from 'lucide-react';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import {
  calculationSettingsClient,
  type FormPriceRule,
  type LaminationPriceRule,
  type PrintPriceRule,
  type ServicePriceRule
} from '../shared/api/calculation-settings';
import {
  calculationsClient,
  type CalculationBlockPayload,
  type CalculationBlockType,
  type CalculationRecord,
  type CalculationStatus,
  type CalculationSummary
} from '../shared/api/calculations';
import { materialsClient } from '../shared/api/materials';
import { warehousesClient } from '../shared/api/warehouses';
import type { CustomerListItem, WarehouseStockLevelItem } from '@bestapp/shared';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../shared/components';
import { cardClass, dangerButtonClass, ghostButtonClass, inputClass, panelClass, secondaryButtonClass, tableBodyRowClass } from '../shared/styles';
import { formatCurrency, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';
import type { MaterialListItem } from '../shared/materials';

type CalculationEditorMode = 'create' | 'edit' | 'view';
type CalculationEditorBlockType = CalculationBlockType;

type BlockDraft = {
  id: string;
  type: CalculationEditorBlockType;
  title: string;
  linkedBlockId?: string | null;
  values: Record<string, string>;
};

type DerivedBlock = BlockDraft & {
  computed: {
    total: number;
    warning?: string | null;
    printCount?: number;
    requiredA1?: number;
    linkedCount?: number;
    unitPrice?: number;
    ruleLabel?: string;
    availableStock?: number;
    stockUnitCost?: number;
  };
};

type HeaderState = {
  date: string;
  customerId: string;
  customerName: string;
  productName: string;
  quantity: string;
  note: string;
  status: CalculationStatus;
  profitPercent: string;
  finalPrice: string;
};

const PAPER_GRAMS = ['80 qr', '90 qr', '115 qr', '130 qr', '170 qr', '250 qr', '300 qr'];
const PAPER_FORMATS = ['64x90', '70x100', 'A4', 'A3', 'A2'];
const PRINT_COLOR_MODES = ['4+0', '4+4', '1+0', '1+1'] as const;
const LAMINATION_TYPES = ['Mat', 'Parlaq'] as const;
const SIDE_MODES = ['1+0', '1+1'] as const;
const SERVICE_TOOLBAR_ITEMS = [
  { label: 'Termokley', presetName: 'Termokley' },
  { label: 'Tel tikiş', presetName: 'Tel tikiş' },
  { label: 'Əl işi', presetName: 'Əl işi' },
  { label: 'Kəsim', presetName: 'Kəsim' },
  { label: 'Beqovka', presetName: 'Beqovka' },
  { label: 'Büküm', presetName: 'Büküm' },
  { label: 'Deşmə', presetName: 'Deşmə' },
  { label: 'Qablaşdırma', presetName: 'Qablaşdırma' },
  { label: 'Dizayn', presetName: 'Dizayn' },
  { label: 'Çatdırılma', presetName: 'Çatdırılma' },
  { label: 'Digər xərc', presetName: 'Digər xərc' }
];

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 4 }).format(value);
}

function getText(values: Record<string, string>, key: string, fallback = '') {
  const value = values[key];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function setText(values: Record<string, string>, key: string, value: string) {
  return { ...values, [key]: value };
}

function buildHeaderDefaults(): HeaderState {
  return {
    date: new Date().toISOString().slice(0, 10),
    customerId: '',
    customerName: '',
    productName: '',
    quantity: '1',
    note: '',
    status: 'draft',
    profitPercent: '30',
    finalPrice: ''
  };
}

function createBlock(type: CalculationEditorBlockType, title: string): BlockDraft {
  switch (type) {
    case 'paper':
      return {
        id: createId(),
        type,
        title,
        values: {
          materialId: '',
          paperType: '',
          gram: '',
          a1Format: '',
          printFormat: '',
          printUpCount: '1',
          waste: '0',
          a1UpCount: '1',
          unitCost: '',
          unitCostSource: 'auto'
        }
      };
    case 'printing':
      return {
        id: createId(),
        type,
        title,
        values: {
          linkedBlockId: '',
          colorMode: '4+0',
          unitPrice: '',
          unitPriceSource: 'auto',
          discount: '0'
        }
      };
    case 'form':
      return {
        id: createId(),
        type,
        title,
        values: {
          formRuleId: '',
          name: '',
          unit: '',
          quantity: '1',
          unitPrice: '',
          unitPriceSource: 'auto'
        }
      };
    case 'lamination':
      return {
        id: createId(),
        type,
        title,
        values: {
          linkedBlockId: '',
          laminationType: 'Mat',
          sideMode: '1+0',
          quantity: '1',
          unitPrice: '',
          unitPriceSource: 'auto',
          discount: '0'
        }
      };
    case 'service':
    default:
      return {
        id: createId(),
        type: 'service',
        title,
        values: {
          serviceType: '',
          serviceRuleId: '',
          name: title,
          quantity: '1',
          unit: 'ədəd',
          unitPrice: '',
          unitPriceSource: 'auto',
          allowDiscount: 'true',
          discount: '0'
        }
      };
  }
}

function calculationTypeLabel(type: CalculationEditorBlockType) {
  switch (type) {
    case 'paper':
      return 'Kağız';
    case 'printing':
      return 'Çap';
    case 'form':
      return 'Forma';
    case 'lamination':
      return 'Laminasiya';
    default:
      return 'Digər iş';
  }
}

function blockIcon(type: CalculationEditorBlockType) {
  switch (type) {
    case 'paper':
      return FileText;
    case 'printing':
      return Printer;
    case 'form':
      return Layers3;
    case 'lamination':
      return Sparkles;
    default:
      return Wrench;
  }
}

function buildCustomerLabel(customer: CustomerListItem) {
  return customer.companyName ? `${customer.name} · ${customer.companyName}` : customer.name;
}

function getMaterialLabel(material?: MaterialListItem | null) {
  if (!material) {
    return '—';
  }

  return `${material.materialNo} · ${material.name}`;
}

function computeSummary(blocks: DerivedBlock[], profitPercentInput: string, finalPriceInput: string): CalculationSummary {
  const paperAmount = roundMoney(blocks.filter((block) => block.type === 'paper').reduce((sum, block) => sum + block.computed.total, 0));
  const printAmount = roundMoney(blocks.filter((block) => block.type === 'printing').reduce((sum, block) => sum + block.computed.total, 0));
  const formAmount = roundMoney(blocks.filter((block) => block.type === 'form').reduce((sum, block) => sum + block.computed.total, 0));
  const laminationAmount = roundMoney(blocks.filter((block) => block.type === 'lamination').reduce((sum, block) => sum + block.computed.total, 0));
  const otherCostAmount = roundMoney(blocks.filter((block) => block.type === 'service').reduce((sum, block) => sum + block.computed.total, 0));
  const totalCost = roundMoney(paperAmount + printAmount + formAmount + laminationAmount + otherCostAmount);
  const profitPercent = roundMoney(toNumber(profitPercentInput));
  const profitAmount = roundMoney((totalCost * profitPercent) / 100);
  const recommendedSalePrice = roundMoney(totalCost + profitAmount);
  const finalPrice = roundMoney(finalPriceInput ? toNumber(finalPriceInput) : recommendedSalePrice);
  const realProfit = roundMoney(finalPrice - totalCost);
  const realProfitPercent = totalCost > 0 ? roundMoney((realProfit / totalCost) * 100) : 0;

  return {
    paperAmount,
    printAmount,
    formAmount,
    laminationAmount,
    otherCostAmount,
    totalCost,
    profitPercent,
    profitAmount,
    recommendedSalePrice,
    finalPrice,
    realProfit,
    realProfitPercent,
    materialCost: paperAmount,
    serviceCost: roundMoney(printAmount + formAmount + laminationAmount + otherCostAmount),
    salePrice: recommendedSalePrice
  };
}

function findSelectedCustomer(customerId: string, customers: CustomerListItem[]) {
  return customers.find((customer) => customer.id === customerId) ?? null;
}

function findSelectedMaterial(materialId: string, materials: MaterialListItem[]) {
  return materials.find((material) => material.id === materialId) ?? null;
}

function findSelectedBlock(blockId: string | null | undefined, blocks: DerivedBlock[]) {
  if (!blockId) {
    return null;
  }

  return blocks.find((block) => block.id === blockId) ?? null;
}

function buildBlockPayload(block: DerivedBlock) {
  return {
    id: block.id,
    type: block.type,
    title: block.title,
    linkedBlockId: block.linkedBlockId ?? null,
    values: block.values,
    computed: block.computed
  } satisfies CalculationBlockPayload;
}

export function CalculationBlockEditorPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const editorId = params.id ?? null;
  const isNewRoute = !editorId;
  const isEditRoute = Boolean(editorId) && window.location.pathname.endsWith('/edit');
  const mode: CalculationEditorMode = isNewRoute ? 'create' : isEditRoute ? 'edit' : 'view';
  const readOnly = mode === 'view';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderState>(buildHeaderDefaults());
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [openBlockIds, setOpenBlockIds] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [stockLevels, setStockLevels] = useState<WarehouseStockLevelItem[]>([]);
  const [printRules, setPrintRules] = useState<PrintPriceRule[]>([]);
  const [laminationRules, setLaminationRules] = useState<LaminationPriceRule[]>([]);
  const [formRules, setFormRules] = useState<FormPriceRule[]>([]);
  const [serviceRules, setServiceRules] = useState<ServicePriceRule[]>([]);
  const [existingRecord, setExistingRecord] = useState<CalculationRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [materialResponse, customerResponse, stockResponse, printResponse, laminationResponse, formResponse, serviceResponse] =
          await Promise.all([
            materialsClient.list({ page: 1, limit: 200, status: 'active' }),
            customersClient.list({ page: 1, limit: 200, status: 'active' }),
            warehousesClient.levels({ page: 1, limit: 200 }),
            calculationSettingsClient.printPrices.list({ page: 1, limit: 200, isActive: true }),
            calculationSettingsClient.laminationPrices.list({ page: 1, limit: 200, isActive: true }),
            calculationSettingsClient.formPrices.list({ page: 1, limit: 200, isActive: true }),
            calculationSettingsClient.servicePrices.list({ page: 1, limit: 200, isActive: true })
          ]);

        if (cancelled) {
          return;
        }

        setMaterials(materialResponse.data);
        setCustomers(customerResponse.data);
        setStockLevels(stockResponse.data);
        setPrintRules(printResponse.data);
        setLaminationRules(laminationResponse.data);
        setFormRules(formResponse.data);
        setServiceRules(serviceResponse.data);

        if (!editorId) {
          setHeader(buildHeaderDefaults());
          setBlocks([]);
          setOpenBlockIds([]);
          setExistingRecord(null);
          return;
        }

        const calculation = await calculationsClient.get(editorId);

        if (cancelled) {
          return;
        }

        setExistingRecord(calculation);
        setHeader({
          date: calculation.date ?? new Date().toISOString().slice(0, 10),
          customerId: calculation.customerId ?? '',
          customerName: calculation.customerName ?? '',
          productName: calculation.productName ?? '',
          quantity: String(calculation.quantity ?? 1),
          note: calculation.note ?? '',
          status: calculation.status,
          profitPercent: String(calculation.profitPercent ?? 30),
          finalPrice: String(calculation.finalPrice ?? '')
        });

        const incomingBlocks = Array.isArray(calculation.sections?.blocks) ? calculation.sections.blocks : [];
        setBlocks(
          incomingBlocks.length > 0
            ? incomingBlocks.map((block) => ({
                id: block.id,
                type: block.type,
                title: block.title,
                linkedBlockId: block.linkedBlockId ?? null,
                values: Object.entries(block.values ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
                  acc[key] = value == null ? '' : String(value);
                  return acc;
                }, {})
              }))
            : []
        );
        setOpenBlockIds(incomingBlocks.map((block) => block.id));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Hesablama yüklənmədi');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [editorId]);

  const stockMap = useMemo(() => {
    const map = new Map<string, { available: number; unitCost: number }>();

    for (const level of stockLevels) {
      const materialId = level.material?.id || level.materialId;
      const current = map.get(materialId) ?? { available: 0, unitCost: 0 };
      current.available += Number(level.available ?? 0);
      const suggested = Number(level.material?.averageCost ?? level.material?.unitCost ?? level.material?.costPrice ?? 0);
      if (current.unitCost <= 0 && suggested > 0) {
        current.unitCost = suggested;
      }
      map.set(materialId, current);
    }

    return map;
  }, [stockLevels]);

  const derivedBlocks = useMemo(() => {
    const draftMap = new Map(blocks.map((block) => [block.id, block]));
    const cache = new Map<string, DerivedBlock>();

    const resolve = (blockId: string, stack = new Set<string>()): DerivedBlock | null => {
      const cached = cache.get(blockId);
      if (cached) {
        return cached;
      }

      const block = draftMap.get(blockId);
      if (!block) {
        return null;
      }

      if (stack.has(blockId)) {
        return {
          ...block,
          computed: {
            total: 0,
            warning: 'Blok bağlantısında döngü aşkarlandı'
          }
        };
      }

      stack.add(blockId);
      const result = computeDerivedBlock(block, {
        header,
        materials,
        stockMap,
        printRules,
        laminationRules,
        formRules,
        serviceRules,
        resolveLinked: (linkedId) => resolve(linkedId, new Set(stack))
      });
      stack.delete(blockId);

      cache.set(blockId, result);
      return result;
    };

    return blocks.map((block) => resolve(block.id)).filter(Boolean) as DerivedBlock[];
  }, [blocks, formRules, header, laminationRules, materials, printRules, serviceRules, stockMap]);

  const summary = useMemo(() => computeSummary(derivedBlocks, header.profitPercent, header.finalPrice), [derivedBlocks, header.finalPrice, header.profitPercent]);
  const warnings = useMemo(
    () => derivedBlocks.map((block) => block.computed.warning).filter(Boolean) as string[],
    [derivedBlocks]
  );

  const isBlockedFromEditing = readOnly || (existingRecord?.status && existingRecord.status !== 'draft' && mode === 'edit');

  const goBack = () => navigate('/calculations');
  const openNew = () => navigate('/calculations/new');
  const openEdit = () => {
    if (editorId) {
      navigate(`/calculations/${editorId}/edit`);
    }
  };

  const addBlock = (type: CalculationEditorBlockType, title: string) => {
    if (isBlockedFromEditing) {
      return;
    }

    const nextBlock = createBlock(type, title);
    setBlocks((current) => [...current, nextBlock]);
    setOpenBlockIds((current) => [...current, nextBlock.id]);
  };

  const updateHeader = (key: keyof HeaderState, value: string) => {
    if (isBlockedFromEditing) {
      return;
    }

    setHeader((current) => ({ ...current, [key]: value }));
  };

  const updateBlock = (blockId: string, updater: (current: BlockDraft) => BlockDraft) => {
    if (isBlockedFromEditing) {
      return;
    }

    setBlocks((current) => current.map((block) => (block.id === blockId ? updater(block) : block)));
  };

  const setBlockValue = (blockId: string, key: string, value: string) => {
    updateBlock(blockId, (current) => ({
      ...current,
      values: setText(current.values, key, value)
    }));
  };

  const duplicateBlock = (blockId: string) => {
    if (isBlockedFromEditing) {
      return;
    }

    const source = blocks.find((block) => block.id === blockId);
    if (!source) {
      return;
    }

    const copy: BlockDraft = {
      ...source,
      id: createId(),
      title: `${source.title} (nüsxə)`,
      values: { ...source.values }
    };

    setBlocks((current) => [...current, copy]);
    setOpenBlockIds((current) => [...current, copy.id]);
  };

  const removeBlock = (blockId: string) => {
    if (isBlockedFromEditing) {
      return;
    }

    setBlocks((current) => current.filter((block) => block.id !== blockId));
    setOpenBlockIds((current) => current.filter((id) => id !== blockId));
  };

  const toggleBlock = (blockId: string) => {
    setOpenBlockIds((current) => (current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId]));
  };

  const buildPayload = (): Parameters<typeof calculationsClient.create>[0] => ({
    customerId: header.customerId.trim() || undefined,
    date: header.date,
    customerName: header.customerName.trim() || undefined,
    productName: header.productName.trim(),
    quantity: toNumber(header.quantity),
    note: header.note.trim() || undefined,
    profitPercent: toNumber(header.profitPercent),
    finalPrice: header.finalPrice.trim() ? toNumber(header.finalPrice) : undefined,
    status: header.status,
    sections: {
      blocks: derivedBlocks.map(buildBlockPayload),
      summary
    }
  });

  const save = async () => {
    if (isBlockedFromEditing) {
      return;
    }

    if (!header.productName.trim()) {
      toast.warning('Məhsul adını daxil edin');
      return;
    }

    if (derivedBlocks.length === 0) {
      toast.warning('Ən azı bir blok əlavə edin');
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload();
      const saved = editorId && mode === 'edit' ? await calculationsClient.update(editorId, payload) : await calculationsClient.create(payload);
      toast.success('Hesablama saxlanıldı', saved.number);
      navigate('/calculations');
    } catch (saveError) {
      toast.error('Hesablama saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const selectCustomer = (customerId: string) => {
    if (isBlockedFromEditing) {
      return;
    }

    const selected = findSelectedCustomer(customerId, customers);
    setHeader((current) => ({
      ...current,
      customerId,
      customerName: selected ? buildCustomerLabel(selected) : current.customerName
    }));
  };

  const content = loading ? (
    <LoadingState rows={4} />
  ) : error ? (
    <ErrorState title="Hesablama yüklənmədi" description={error} onRetry={() => window.location.reload()} />
  ) : (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className={`${cardClass} p-6`}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Tarix</span>
              <Input type="date" value={header.date} onChange={(event) => updateHeader('date', event.target.value)} disabled={isBlockedFromEditing} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Müştəri seçimi</span>
              <select
                value={header.customerId}
                onChange={(event) => selectCustomer(event.target.value)}
                disabled={isBlockedFromEditing}
                className={inputClass}
              >
                <option value="">Müştəri seçin</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {buildCustomerLabel(customer)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Manual müştəri adı</span>
              <Input
                value={header.customerName}
                onChange={(event) => updateHeader('customerName', event.target.value)}
                disabled={isBlockedFromEditing}
                placeholder="Manual daxil etmək istəsəniz"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Məhsul adı</span>
              <Input value={header.productName} onChange={(event) => updateHeader('productName', event.target.value)} disabled={isBlockedFromEditing} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Tiraj</span>
              <Input type="number" step="1" value={header.quantity} onChange={(event) => updateHeader('quantity', event.target.value)} disabled={isBlockedFromEditing} />
            </label>
            <label className="block space-y-2 xl:col-span-5">
              <span className="text-sm font-medium text-slate-700">Qeyd</span>
              <textarea
                rows={3}
                value={header.note}
                onChange={(event) => updateHeader('note', event.target.value)}
                disabled={isBlockedFromEditing}
                className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400/70 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Lazım olarsa qısa qeyd əlavə edin"
              />
            </label>
          </div>
        </Card>

        <Card className={`${cardClass} p-6`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Bloklar</h2>
              <p className="text-sm text-slate-600">Kağız, çap, laminasiya və xidmət bloklarını buradan əlavə edin.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => addBlock('paper', 'Kağız')}>
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Kağız əlavə et
                </span>
              </Button>
              <Button variant="secondary" onClick={() => addBlock('printing', 'Çap')}>
                <span className="inline-flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Çap əlavə et
                </span>
              </Button>
              <Button variant="secondary" onClick={() => addBlock('form', 'Forma')}>
                <span className="inline-flex items-center gap-2">
                  <Layers3 className="h-4 w-4" />
                  Forma əlavə et
                </span>
              </Button>
              <Button variant="secondary" onClick={() => addBlock('lamination', 'Laminasiya')}>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Laminasiya əlavə et
                </span>
              </Button>
              {SERVICE_TOOLBAR_ITEMS.map((item) => (
                <Button key={item.label} variant="secondary" onClick={() => addBlock('service', item.presetName)}>
                  <span className="inline-flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    {item.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {blocks.length === 0 ? (
            <EmptyState
              title="Hələ blok əlavə edilməyib"
              description="Yuxarıdakı düymələrlə kağız, çap, laminasiya və xidmət bloklarını əlavə edin."
              icon={Plus}
              actionLabel="Kağız əlavə et"
              onAction={() => addBlock('paper', 'Kağız')}
            />
          ) : (
            <div className="space-y-4">
              {derivedBlocks.map((block) => {
                const Icon = blockIcon(block.type);
                const isOpen = openBlockIds.includes(block.id);
                const linkedBlock = findSelectedBlock(block.linkedBlockId, derivedBlocks);

                return (
                  <Card key={block.id} className={`${cardClass} overflow-hidden`}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-4 border-b border-white/20 px-5 py-4 text-left transition hover:bg-white/60"
                      onClick={() => toggleBlock(block.id)}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-2xl bg-gradient-to-br from-cyan-500/15 via-violet-500/15 to-fuchsia-500/15 p-2.5 text-cyan-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-slate-950">{block.title}</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                              {calculationTypeLabel(block.type)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {linkedBlock ? `Bağlı blok: ${linkedBlock.title}` : 'Bağlı blok yoxdur'}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Cəmi</div>
                          <div className="text-lg font-semibold text-slate-950">{formatCurrency(block.computed.total, 'AZN')}</div>
                        </div>
                        <span className="rounded-full border border-white/20 bg-white/70 px-3 py-2 text-sm text-slate-600">{isOpen ? 'Bağla' : 'Aç'}</span>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="space-y-5 px-5 py-5">
                        {block.computed.warning ? (
                          <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">{block.computed.warning}</div>
                        ) : null}

                        {renderBlockBody({
                          block,
                          derivedBlocks,
                          materials,
                          stockMap,
                          printRules,
                          laminationRules,
                          formRules,
                          serviceRules,
                          readOnly: isBlockedFromEditing,
                          onUpdate: setBlockValue,
                          onPatch: updateBlock
                        })}

                        {!isBlockedFromEditing ? (
                          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                            <Button variant="secondary" onClick={() => duplicateBlock(block.id)}>
                              <span className="inline-flex items-center gap-2">
                                <Copy className="h-4 w-4" />
                                Nüsxələ
                              </span>
                            </Button>
                            <Button variant="ghost" className={dangerButtonClass} onClick={() => removeBlock(block.id)}>
                              <span className="inline-flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Sil
                              </span>
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card className={`${cardClass} sticky top-6 p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Yekun panel</h2>
              <p className="text-sm text-slate-600">Maya və satış göstəriciləri dərhal yenilənir.</p>
            </div>
            <div className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              {header.status === 'draft' ? 'Qaralama' : header.status}
            </div>
          </div>

          <div className="grid gap-3">
            {[
              ['Kağız cəmi', summary.paperAmount],
              ['Çap cəmi', summary.printAmount],
              ['Forma cəmi', summary.formAmount],
              ['Laminasiya cəmi', summary.laminationAmount],
              ['Digər işlər cəmi', summary.otherCostAmount],
              ['Cəmi maya', summary.totalCost],
              ['Qazanc faizi', `${formatNumber(summary.profitPercent, 2)}%`],
              ['Qazanc məbləği', formatCurrency(summary.profitAmount, 'AZN')],
              ['Tövsiyə satış qiyməti', formatCurrency(summary.recommendedSalePrice, 'AZN')],
              ['Final satış qiyməti', formatCurrency(summary.finalPrice, 'AZN')],
              ['Real qazanc', formatCurrency(summary.realProfit, 'AZN')],
              ['Real qazanc faizi', `${formatNumber(summary.realProfitPercent, 2)}%`]
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label as string}</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{value as string | number}</div>
              </div>
            ))}
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-sm font-medium text-slate-700">Qazanc faizi</span>
            <Input value={header.profitPercent} onChange={(event) => updateHeader('profitPercent', event.target.value)} disabled={isBlockedFromEditing} />
          </label>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium text-slate-700">Final satış qiyməti</span>
            <Input
              value={header.finalPrice}
              onChange={(event) => updateHeader('finalPrice', event.target.value)}
              disabled={isBlockedFromEditing}
              placeholder="Avto dəyəri saxlamaq üçün boş qala bilər"
            />
            <div className="text-xs text-slate-500">Boş saxlanarsa tövsiyə satış qiyməti istifadə olunacaq.</div>
          </label>

          {warnings.length > 0 ? (
            <div className="mt-5 space-y-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-800">
              {warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={goBack}>
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Geri
              </span>
            </Button>
            {!readOnly ? (
              <Button onClick={() => void save()} disabled={saving}>
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Yadda saxlanır...' : 'Yadda saxla'}
                </span>
              </Button>
            ) : (
              <Button onClick={openEdit} disabled={!editorId}>
                Redaktə et
              </Button>
            )}
            {readOnly ? (
              <Button variant="secondary" onClick={openNew}>
                Yeni hesablama
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hesablama"
        description="Bu səhifə real mətbəə blok kalkulyatorudur: kağız, çap, laminasiya və servis blokları burada qurulur."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={goBack}>
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Siyahıya qayıt
              </span>
            </Button>
            {!readOnly ? (
              <Button onClick={() => void save()} disabled={saving}>
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Yadda saxlanır...' : 'Yadda saxla'}
                </span>
              </Button>
            ) : (
              <Button onClick={openEdit} disabled={!editorId}>
                Redaktə et
              </Button>
            )}
          </div>
        }
      />
      {content}
    </div>
  );
}

function computeDerivedBlock(
  block: BlockDraft,
  context: {
    header: HeaderState;
    materials: MaterialListItem[];
    stockMap: Map<string, { available: number; unitCost: number }>;
    printRules: PrintPriceRule[];
    laminationRules: LaminationPriceRule[];
    formRules: FormPriceRule[];
    serviceRules: ServicePriceRule[];
    resolveLinked: (blockId: string) => DerivedBlock | null;
  }
): DerivedBlock {
  const base: DerivedBlock = {
    ...block,
    computed: {
      total: 0
    }
  };

  const quantity = toNumber(context.header.quantity);

  if (block.type === 'paper') {
    const material = findSelectedMaterial(getText(block.values, 'materialId'), context.materials);
    const stock = material ? context.stockMap.get(material.id) : undefined;
    const stockUnitCost = stock?.unitCost ?? Number(material?.averageCost ?? material?.unitCost ?? material?.costPrice ?? 0);
    const source = getText(block.values, 'unitCostSource', 'auto');
    const displayUnitCost = source === 'manual' ? toNumber(getText(block.values, 'unitCost')) : stockUnitCost;
    const printUpCount = Math.max(toNumber(getText(block.values, 'printUpCount', '1')), 0.0001);
    const waste = Math.max(toNumber(getText(block.values, 'waste', '0')), 0);
    const a1UpCount = Math.max(toNumber(getText(block.values, 'a1UpCount', '1')), 0.0001);
    const printCount = quantity > 0 ? roundMoney(quantity / printUpCount) : 0;
    const requiredA1 = roundMoney((printCount + waste) / a1UpCount);
    const total = roundMoney(requiredA1 * displayUnitCost);
    const warning = material ? null : 'Material seçin';

    return {
      ...base,
      computed: {
        total,
        printCount,
        requiredA1,
        unitPrice: displayUnitCost,
        availableStock: stock?.available ?? 0,
        stockUnitCost,
        warning
      }
    };
  }

  if (block.type === 'printing') {
    const linkedBlock = context.resolveLinked(getText(block.values, 'linkedBlockId'));
    const printCount = linkedBlock?.computed.printCount ?? linkedBlock?.computed.requiredA1 ?? 0;
    const colorMode = getText(block.values, 'colorMode', '4+0');
    const rule = context.printRules.find(
      (item) => item.isActive && item.colorMode === colorMode && printCount >= item.minQuantity && printCount <= item.maxQuantity
    );
    const source = getText(block.values, 'unitPriceSource', 'auto');
    const unitPrice = source === 'manual' ? toNumber(getText(block.values, 'unitPrice')) : Number(rule?.price ?? 0);
    const discount = Math.max(toNumber(getText(block.values, 'discount', '0')), 0);
    const total = roundMoney(Math.max(unitPrice - discount, 0));
    const warning = rule ? null : 'Bu tiraj və rəng üçün çap qiyməti tapılmadı';

    return {
      ...base,
      computed: {
        total,
        printCount,
        unitPrice,
        ruleLabel: rule ? `${rule.colorMode} · ${formatNumber(rule.minQuantity, 0)}-${formatNumber(rule.maxQuantity, 0)}` : undefined,
        warning
      }
    };
  }

  if (block.type === 'lamination') {
    const linkedBlock = context.resolveLinked(getText(block.values, 'linkedBlockId'));
    const linkedCount = linkedBlock?.computed.printCount ?? linkedBlock?.computed.requiredA1 ?? 0;
    const laminationType = getText(block.values, 'laminationType', 'Mat');
    const sideMode = getText(block.values, 'sideMode', '1+0');
    const rule = context.laminationRules.find(
      (item) => item.isActive && item.laminationType.toLowerCase() === laminationType.toLowerCase() && item.sideMode === sideMode
    );
    const source = getText(block.values, 'unitPriceSource', 'auto');
    const unitPrice = source === 'manual' ? toNumber(getText(block.values, 'unitPrice')) : Number(rule?.unitPrice ?? 0);
    const discount = Math.max(toNumber(getText(block.values, 'discount', '0')), 0);
    const total = roundMoney(Math.max(linkedCount * unitPrice - discount, 0));
    const warning = rule ? null : 'Bu laminasiya üçün qiymət tapılmadı';

    return {
      ...base,
      computed: {
        total,
        linkedCount,
        unitPrice,
        warning
      }
    };
  }

  if (block.type === 'form') {
    const formRuleId = getText(block.values, 'formRuleId');
    const rule = context.formRules.find((item) => item.id === formRuleId && item.isActive) ?? null;
    const source = getText(block.values, 'unitPriceSource', 'auto');
    const unitPrice = source === 'manual' ? toNumber(getText(block.values, 'unitPrice')) : Number(rule?.unitPrice ?? 0);
    const unit = getText(block.values, 'unit', rule?.unit ?? 'ədəd');
    const count = Math.max(toNumber(getText(block.values, 'quantity', '1')), 0);
    const total = roundMoney(count * unitPrice);
    const warning = formRuleId && !rule ? 'Seçilən forma qiyməti tapılmadı' : null;

    return {
      ...base,
      computed: {
        total,
        unitPrice,
        warning
      }
    };
  }

  const serviceRuleId = getText(block.values, 'serviceRuleId');
  const rule = context.serviceRules.find((item) => item.id === serviceRuleId && item.isActive) ?? null;
  const source = getText(block.values, 'unitPriceSource', 'auto');
  const unitPrice = source === 'manual' ? toNumber(getText(block.values, 'unitPrice')) : Number(rule?.unitPrice ?? 0);
  const quantityValue = Math.max(toNumber(getText(block.values, 'quantity', '1')), 0);
  const allowDiscount = getText(block.values, 'allowDiscount', 'true') === 'true' || Boolean(rule?.allowDiscount);
  const discount = allowDiscount ? Math.max(toNumber(getText(block.values, 'discount', '0')), 0) : 0;
  const total = roundMoney(Math.max(quantityValue * unitPrice - discount, 0));
  const warning = serviceRuleId && !rule ? 'Seçilən xidmət qiyməti tapılmadı' : null;

  return {
    ...base,
    computed: {
      total,
      unitPrice,
      warning
    }
  };
}

function renderBlockBody(props: {
  block: DerivedBlock;
  derivedBlocks: DerivedBlock[];
  materials: MaterialListItem[];
  stockMap: Map<string, { available: number; unitCost: number }>;
  printRules: PrintPriceRule[];
  laminationRules: LaminationPriceRule[];
  formRules: FormPriceRule[];
  serviceRules: ServicePriceRule[];
  readOnly: boolean;
  onUpdate: (blockId: string, key: string, value: string) => void;
  onPatch: (blockId: string, updater: (current: BlockDraft) => BlockDraft) => void;
}) {
  const { block, derivedBlocks, materials, stockMap, printRules, laminationRules, formRules, serviceRules, readOnly, onUpdate, onPatch } = props;

  if (block.type === 'paper') {
    const selectedMaterial = findSelectedMaterial(getText(block.values, 'materialId'), materials);
    const materialStock = selectedMaterial ? stockMap.get(selectedMaterial.id) : undefined;
    const autoUnitCost = block.computed.unitPrice ?? 0;
    const displayUnitCost = getText(block.values, 'unitCostSource', 'auto') === 'manual' ? getText(block.values, 'unitCost') : String(autoUnitCost || '');

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Blok adı / təyinat</span>
          <Input value={block.title} onChange={(event) => onPatch(block.id, (current) => ({ ...current, title: event.target.value }))} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Material seçimi</span>
          <select
            value={getText(block.values, 'materialId')}
            onChange={(event) => {
              const material = findSelectedMaterial(event.target.value, materials);
              const stock = material ? stockMap.get(material.id) : undefined;
              onPatch(block.id, (current) => ({
                ...current,
                values: {
                  ...current.values,
                  materialId: event.target.value,
                  unitCostSource: getText(current.values, 'unitCostSource', 'auto'),
                  unitCost:
                    getText(current.values, 'unitCostSource', 'auto') === 'manual'
                      ? getText(current.values, 'unitCost')
                      : String(stock?.unitCost ?? Number(material?.averageCost ?? material?.unitCost ?? material?.costPrice ?? 0))
                }
              }));
            }}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">Material seçin</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {getMaterialLabel(material)}
              </option>
            ))}
          </select>
          {selectedMaterial ? (
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div>Qalıq: {formatQuantity(materialStock?.available ?? 0)} {selectedMaterial.stockUnit || selectedMaterial.unit}</div>
              <div>
                Maya: {formatCurrency(materialStock?.unitCost ?? Number(selectedMaterial.averageCost ?? selectedMaterial.unitCost ?? selectedMaterial.costPrice ?? 0), 'AZN')} /{' '}
                {selectedMaterial.stockUnit || selectedMaterial.unit}
              </div>
            </div>
          ) : null}
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kağız növü</span>
          <select
            value={getText(block.values, 'paperType')}
            onChange={(event) => onUpdate(block.id, 'paperType', event.target.value)}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">Növ seçin</option>
            {['Ofset', 'Melovka', 'Karton', 'Kraft'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Qram</span>
          <select value={getText(block.values, 'gram')} onChange={(event) => onUpdate(block.id, 'gram', event.target.value)} disabled={readOnly} className={inputClass}>
            <option value="">Qram seçin</option>
            {PAPER_GRAMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">A1 formatı</span>
          <select value={getText(block.values, 'a1Format')} onChange={(event) => onUpdate(block.id, 'a1Format', event.target.value)} disabled={readOnly} className={inputClass}>
            <option value="">Format seçin</option>
            {PAPER_FORMATS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çap formatı</span>
          <Input value={getText(block.values, 'printFormat')} onChange={(event) => onUpdate(block.id, 'printFormat', event.target.value)} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çapa düşən say</span>
          <Input
            type="number"
            value={getText(block.values, 'printUpCount', '1')}
            onChange={(event) => onUpdate(block.id, 'printUpCount', event.target.value)}
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çap sayı</span>
          <Input value={formatQuantity(block.computed.printCount ?? 0)} disabled />
          <div className="text-xs text-slate-500">Tiraj / çapa düşən say hesablanır.</div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Brak</span>
          <Input
            type="number"
            value={getText(block.values, 'waste', '0')}
            onChange={(event) => onUpdate(block.id, 'waste', event.target.value)}
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">A1-ə düşən çap formatı</span>
          <Input
            type="number"
            value={getText(block.values, 'a1UpCount', '1')}
            onChange={(event) => onUpdate(block.id, 'a1UpCount', event.target.value)}
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Lazım olan A1 say</span>
          <Input value={formatQuantity(block.computed.requiredA1 ?? 0)} disabled />
          <div className="text-xs text-slate-500">({formatQuantity(block.computed.printCount ?? 0)} + brak) / A1-ə düşən say</div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kağız ədəd qiyməti</span>
          <Input
            type="number"
            step="0.0001"
            value={displayUnitCost}
            onChange={(event) =>
              onPatch(block.id, (current) => ({
                ...current,
                values: {
                  ...current.values,
                  unitCost: event.target.value,
                  unitCostSource: 'manual'
                }
              }))
            }
            disabled={readOnly}
            placeholder="Maya gəlməzsə manual daxil edin"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kağız cəmi</span>
          <Input value={formatCurrency(block.computed.total, 'AZN')} disabled />
        </label>
      </div>
    );
  }

  if (block.type === 'printing') {
    const linkedOptions = derivedBlocks.filter((item) => item.type === 'paper');
    const selectedColor = getText(block.values, 'colorMode', '4+0');
    const matchedRule = printRules.find(
      (item) =>
        item.isActive &&
        item.colorMode === selectedColor &&
        (block.computed.printCount ?? 0) >= item.minQuantity &&
        (block.computed.printCount ?? 0) <= item.maxQuantity
    );
    const unitPriceValue =
      getText(block.values, 'unitPriceSource', 'auto') === 'manual'
        ? getText(block.values, 'unitPrice')
        : String(block.computed.unitPrice ?? 0);

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Blok adı</span>
          <Input value={block.title} onChange={(event) => onPatch(block.id, (current) => ({ ...current, title: event.target.value }))} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Bağlı kağız bloku</span>
          <select
            value={getText(block.values, 'linkedBlockId')}
            onChange={(event) => onUpdate(block.id, 'linkedBlockId', event.target.value)}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">Kağız seçin</option>
            {linkedOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çap rəngi</span>
          <select value={selectedColor} onChange={(event) => onUpdate(block.id, 'colorMode', event.target.value)} disabled={readOnly} className={inputClass}>
            {PRINT_COLOR_MODES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çap sayı</span>
          <Input value={formatQuantity(block.computed.printCount ?? 0)} disabled />
          <div className="text-xs text-slate-500">Bağlı kağız blokundan gəlir.</div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çap qiyməti</span>
          <Input
            type="number"
            step="0.01"
            value={unitPriceValue}
            onChange={(event) =>
              onPatch(block.id, (current) => ({
                ...current,
                values: {
                  ...current.values,
                  unitPrice: event.target.value,
                  unitPriceSource: 'manual'
                }
              }))
            }
            disabled={readOnly}
            placeholder="Qiymət tapılsa auto dolacaq"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Endirim</span>
          <Input value={getText(block.values, 'discount', '0')} onChange={(event) => onUpdate(block.id, 'discount', event.target.value)} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Çap cəmi</span>
          <Input value={formatCurrency(block.computed.total, 'AZN')} disabled />
        </label>
        <div className="md:col-span-2 xl:col-span-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div>
            Tapılan rule: {matchedRule ? `${matchedRule.colorMode} · ${formatNumber(matchedRule.minQuantity, 0)}-${formatNumber(matchedRule.maxQuantity, 0)} · ${formatCurrency(matchedRule.price, 'AZN')}` : 'Tapılmadı'}
          </div>
          {block.computed.warning ? <div className="mt-1 text-amber-700">{block.computed.warning}</div> : null}
        </div>
      </div>
    );
  }

  if (block.type === 'lamination') {
    const linkedOptions = derivedBlocks.filter((item) => item.type === 'paper' || item.type === 'printing');
    const type = getText(block.values, 'laminationType', 'Mat');
    const sideMode = getText(block.values, 'sideMode', '1+0');
    const matchedRule = laminationRules.find(
      (item) => item.isActive && item.laminationType.toLowerCase() === type.toLowerCase() && item.sideMode === sideMode
    );
    const unitPriceValue =
      getText(block.values, 'unitPriceSource', 'auto') === 'manual'
        ? getText(block.values, 'unitPrice')
        : String(block.computed.unitPrice ?? 0);

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Blok adı</span>
          <Input value={block.title} onChange={(event) => onPatch(block.id, (current) => ({ ...current, title: event.target.value }))} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Bağlı blok</span>
          <select value={getText(block.values, 'linkedBlockId')} onChange={(event) => onUpdate(block.id, 'linkedBlockId', event.target.value)} disabled={readOnly} className={inputClass}>
            <option value="">Blok seçin</option>
            {linkedOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Laminasiya növü</span>
          <select value={type} onChange={(event) => onUpdate(block.id, 'laminationType', event.target.value)} disabled={readOnly} className={inputClass}>
            {LAMINATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Üz</span>
          <select value={sideMode} onChange={(event) => onUpdate(block.id, 'sideMode', event.target.value)} disabled={readOnly} className={inputClass}>
            {SIDE_MODES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Say</span>
          <Input value={formatQuantity(block.computed.linkedCount ?? 0)} disabled />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Vahid qiymət</span>
          <Input
            type="number"
            step="0.01"
            value={unitPriceValue}
            onChange={(event) =>
              onPatch(block.id, (current) => ({
                ...current,
                values: {
                  ...current.values,
                  unitPrice: event.target.value,
                  unitPriceSource: 'manual'
                }
              }))
            }
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Endirim</span>
          <Input value={getText(block.values, 'discount', '0')} onChange={(event) => onUpdate(block.id, 'discount', event.target.value)} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Cəmi</span>
          <Input value={formatCurrency(block.computed.total, 'AZN')} disabled />
        </label>
        <div className="md:col-span-2 xl:col-span-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {block.computed.warning ? <div className="text-amber-700">{block.computed.warning}</div> : <div>Rule: {matchedRule ? formatCurrency(matchedRule.unitPrice, 'AZN') : 'Tapılmadı'}</div>}
        </div>
      </div>
    );
  }

  if (block.type === 'form') {
    const selectedRule = formRules.find((item) => item.id === getText(block.values, 'formRuleId')) ?? null;
    const unitPriceValue =
      getText(block.values, 'unitPriceSource', 'auto') === 'manual'
        ? getText(block.values, 'unitPrice')
        : String(block.computed.unitPrice ?? 0);

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Blok adı</span>
          <Input value={block.title} onChange={(event) => onPatch(block.id, (current) => ({ ...current, title: event.target.value }))} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Forma seçimi</span>
          <select
            value={getText(block.values, 'formRuleId')}
            onChange={(event) => {
              const rule = formRules.find((item) => item.id === event.target.value) ?? null;
              onPatch(block.id, (current) => ({
                ...current,
                values: {
                  ...current.values,
                  formRuleId: event.target.value,
                  name: rule?.name ?? current.values.name,
                  unit: rule?.unit ?? current.values.unit,
                  unitPriceSource: getText(current.values, 'unitPriceSource', 'auto') === 'manual' ? 'manual' : 'auto',
                  unitPrice:
                    getText(current.values, 'unitPriceSource', 'auto') === 'manual'
                      ? getText(current.values, 'unitPrice')
                      : String(rule?.unitPrice ?? 0)
                }
              }));
            }}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">Forma seçin</option>
            {formRules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Vahid</span>
          <Input value={getText(block.values, 'unit', selectedRule?.unit ?? 'ədəd')} onChange={(event) => onUpdate(block.id, 'unit', event.target.value)} disabled={readOnly} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Ədəd sayı</span>
          <Input
            type="number"
            value={getText(block.values, 'quantity', '1')}
            onChange={(event) => onUpdate(block.id, 'quantity', event.target.value)}
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Ədəd qiyməti</span>
          <Input
            type="number"
            step="0.01"
            value={unitPriceValue}
            onChange={(event) =>
              onPatch(block.id, (current) => ({
                ...current,
                values: {
                  ...current.values,
                  unitPrice: event.target.value,
                  unitPriceSource: 'manual'
                }
              }))
            }
            disabled={readOnly}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Cəmi</span>
          <Input value={formatCurrency(block.computed.total, 'AZN')} disabled />
        </label>
        <div className="md:col-span-2 xl:col-span-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {block.computed.warning ? <div className="text-amber-700">{block.computed.warning}</div> : null}
        </div>
      </div>
    );
  }

  const selectedRule = serviceRules.find((item) => item.id === getText(block.values, 'serviceRuleId')) ?? null;
  const unitPriceValue =
    getText(block.values, 'unitPriceSource', 'auto') === 'manual'
      ? getText(block.values, 'unitPrice')
      : String(block.computed.unitPrice ?? 0);
  const allowDiscount = getText(block.values, 'allowDiscount', 'true') === 'true' || Boolean(selectedRule?.allowDiscount);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Blok adı</span>
        <Input value={block.title} onChange={(event) => onPatch(block.id, (current) => ({ ...current, title: event.target.value }))} disabled={readOnly} />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">İş tipi</span>
        <select
          value={getText(block.values, 'serviceType')}
          onChange={(event) => onUpdate(block.id, 'serviceType', event.target.value)}
          disabled={readOnly}
          className={inputClass}
        >
          <option value="">İş tipi seçin</option>
          {[...new Set(serviceRules.map((item) => item.serviceType))].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">İş seçimi</span>
        <select
          value={getText(block.values, 'serviceRuleId')}
          onChange={(event) => {
            const rule = serviceRules.find((item) => item.id === event.target.value) ?? null;
            onPatch(block.id, (current) => ({
              ...current,
              values: {
                ...current.values,
                serviceRuleId: event.target.value,
                serviceType: rule?.serviceType ?? current.values.serviceType,
                name: rule?.name ?? current.values.name,
                unit: rule?.unit ?? current.values.unit,
                allowDiscount: rule?.allowDiscount ? 'true' : 'false',
                unitPriceSource: getText(current.values, 'unitPriceSource', 'auto') === 'manual' ? 'manual' : 'auto',
                unitPrice:
                  getText(current.values, 'unitPriceSource', 'auto') === 'manual'
                    ? getText(current.values, 'unitPrice')
                    : String(rule?.unitPrice ?? 0)
              }
            }));
          }}
          disabled={readOnly}
          className={inputClass}
        >
          <option value="">İş seçin</option>
          {serviceRules
            .filter((item) => !getText(block.values, 'serviceType') || item.serviceType === getText(block.values, 'serviceType'))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Say</span>
        <Input
          type="number"
          value={getText(block.values, 'quantity', '1')}
          onChange={(event) => onUpdate(block.id, 'quantity', event.target.value)}
          disabled={readOnly}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Vahid</span>
        <Input value={getText(block.values, 'unit', selectedRule?.unit ?? 'ədəd')} onChange={(event) => onUpdate(block.id, 'unit', event.target.value)} disabled={readOnly} />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Vahid qiymət</span>
        <Input
          type="number"
          step="0.01"
          value={unitPriceValue}
          onChange={(event) =>
            onPatch(block.id, (current) => ({
              ...current,
              values: {
                ...current.values,
                unitPrice: event.target.value,
                unitPriceSource: 'manual'
              }
            }))
          }
          disabled={readOnly}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Endirim icazəsi</span>
        <Input value={allowDiscount ? 'Bəli' : 'Xeyr'} disabled />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Endirim</span>
        <Input
          value={getText(block.values, 'discount', '0')}
          onChange={(event) => onUpdate(block.id, 'discount', event.target.value)}
          disabled={readOnly || !allowDiscount}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Cəmi</span>
        <Input value={formatCurrency(block.computed.total, 'AZN')} disabled />
      </label>
      <div className="md:col-span-2 xl:col-span-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {block.computed.warning ? <div className="text-amber-700">{block.computed.warning}</div> : null}
      </div>
    </div>
  );
}
