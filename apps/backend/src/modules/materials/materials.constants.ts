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
  { value: 'kq', label: 'kq' },
  { value: 'litr', label: 'litr' },
  { value: 'metr', label: 'metr' },
  { value: 'rulon', label: 'rulon' },
  { value: 'paket', label: 'paket' }
] as const;

export const MATERIAL_STATUSES = ['all', 'active', 'inactive'] as const;

export type MaterialCategoryCode = (typeof MATERIAL_CATEGORIES)[number]['code'];
export type MaterialUnitValue = (typeof MATERIAL_UNITS)[number]['value'];
export type MaterialStatusFilter = (typeof MATERIAL_STATUSES)[number];

