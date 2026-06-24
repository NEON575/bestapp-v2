export const MATERIAL_CATEGORIES = [
  { code: 'kagiz', label: 'Kağız' },
  { code: 'laminasiya', label: 'Laminasiya' },
  { code: 'forma', label: 'Forma' },
  { code: 'boya', label: 'Boya' },
  { code: 'kimyevi_vasiteler', label: 'Kimyəvi vasitələr' },
  { code: 'qablasdirma', label: 'Qablaşdırma' },
  { code: 'diger_material', label: 'Digər material' }
] as const;

export const MATERIAL_UNITS = [
  { value: 'vərəq', label: 'vərəq' },
  { value: 'ədəd', label: 'ədəd' },
  { value: 'metr', label: 'metr' },
  { value: 'm²', label: 'm²' },
  { value: 'litr', label: 'litr' },
  { value: 'kq', label: 'kq' }
] as const;

export type MaterialCategoryCode = (typeof MATERIAL_CATEGORIES)[number]['code'];
export type MaterialUnitValue = (typeof MATERIAL_UNITS)[number]['value'];
export type MaterialStatusFilter = 'all' | 'active' | 'inactive';

export interface MaterialCategoryItem {
  id: string;
  code: string;
  name: string;
  codePrefix?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface MaterialCategoryParameterValueItem {
  id: string;
  parameterId: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  notes?: string | null;
}

export interface MaterialCategoryParameterItem {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  notes?: string | null;
  values: MaterialCategoryParameterValueItem[];
}

export type MaterialMetadata = Record<string, string>;

export interface MaterialListItem {
  id: string;
  materialNo: string;
  categoryCode: MaterialCategoryCode;
  categoryLabel: string;
  name: string;
  materialType?: string | null;
  gramThickness?: string | null;
  formatSize?: string | null;
  stockUnit?: string | null;
  packageUnit?: string | null;
  defaultUnitsPerPackage?: number | null;
  palletUnit?: string | null;
  packagesPerPallet?: number | null;
  defaultUnitsPerPallet?: number | null;
  unit: MaterialUnitValue;
  currencyCode: string;
  purchasePrice: number;
  aznPrice: number;
  isActive: boolean;
  notes?: string | null;
  metadata?: MaterialMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryCode?: MaterialCategoryCode | '';
  status?: MaterialStatusFilter;
}

export interface CreateMaterialDto {
  categoryCode: MaterialCategoryCode;
  name: string;
  materialType?: string;
  gramThickness?: string;
  formatSize?: string;
  stockUnit?: string;
  packageUnit?: string;
  defaultUnitsPerPackage?: number;
  palletUnit?: string;
  packagesPerPallet?: number;
  defaultUnitsPerPallet?: number;
  unit: MaterialUnitValue;
  currencyCode?: string;
  purchasePrice?: number;
  aznPrice?: number;
  isActive?: boolean;
  notes?: string;
  metadata?: MaterialMetadata;
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {}
