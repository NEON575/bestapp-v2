import { api } from './http';
import { buildQueryParams } from './query';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PrintPriceRule = {
  id: string;
  minQuantity: number;
  maxQuantity: number;
  colorMode: '4+0' | '4+4' | '1+0' | '1+1';
  price: number;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LaminationPriceRule = {
  id: string;
  laminationType: 'mat' | 'parlaq';
  sideMode: '1+0' | '1+1';
  unitPrice: number;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FormPriceRule = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServicePriceRule = {
  id: string;
  serviceType: string;
  name: string;
  unit: string;
  unitPrice: number;
  allowDiscount: boolean;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export type CreatePrintPriceRuleDto = Omit<PrintPriceRule, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePrintPriceRuleDto = Partial<CreatePrintPriceRuleDto>;

export type CreateLaminationPriceRuleDto = Omit<LaminationPriceRule, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLaminationPriceRuleDto = Partial<CreateLaminationPriceRuleDto>;

export type CreateFormPriceRuleDto = Omit<FormPriceRule, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateFormPriceRuleDto = Partial<CreateFormPriceRuleDto>;

export type CreateServicePriceRuleDto = Omit<ServicePriceRule, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateServicePriceRuleDto = Partial<CreateServicePriceRuleDto>;

async function list<T>(path: string, query: ListQuery = {}) {
  const { data } = await api.get<PaginatedResponse<T>>(path, { params: buildQueryParams(query) });
  return data;
}

async function get<T>(path: string) {
  const { data } = await api.get<T>(path);
  return data;
}

async function create<T, D>(path: string, dto: D) {
  const { data } = await api.post<T>(path, dto);
  return data;
}

async function update<T, D>(path: string, dto: D) {
  const { data } = await api.patch<T>(path, dto);
  return data;
}

async function remove<T>(path: string) {
  const { data } = await api.delete<T>(path);
  return data;
}

export const calculationSettingsClient = {
  printPrices: {
    list: (query: ListQuery = {}) => list<PrintPriceRule>('/calculation-settings/print-prices', query),
    get: (id: string) => get<PrintPriceRule>(`/calculation-settings/print-prices/${id}`),
    create: (dto: CreatePrintPriceRuleDto) => create<PrintPriceRule, CreatePrintPriceRuleDto>('/calculation-settings/print-prices', dto),
    update: (id: string, dto: UpdatePrintPriceRuleDto) => update<PrintPriceRule, UpdatePrintPriceRuleDto>(`/calculation-settings/print-prices/${id}`, dto),
    remove: (id: string) => remove<PrintPriceRule>(`/calculation-settings/print-prices/${id}`)
  },
  laminationPrices: {
    list: (query: ListQuery = {}) => list<LaminationPriceRule>('/calculation-settings/lamination-prices', query),
    get: (id: string) => get<LaminationPriceRule>(`/calculation-settings/lamination-prices/${id}`),
    create: (dto: CreateLaminationPriceRuleDto) => create<LaminationPriceRule, CreateLaminationPriceRuleDto>('/calculation-settings/lamination-prices', dto),
    update: (id: string, dto: UpdateLaminationPriceRuleDto) => update<LaminationPriceRule, UpdateLaminationPriceRuleDto>(`/calculation-settings/lamination-prices/${id}`, dto),
    remove: (id: string) => remove<LaminationPriceRule>(`/calculation-settings/lamination-prices/${id}`)
  },
  formPrices: {
    list: (query: ListQuery = {}) => list<FormPriceRule>('/calculation-settings/form-prices', query),
    get: (id: string) => get<FormPriceRule>(`/calculation-settings/form-prices/${id}`),
    create: (dto: CreateFormPriceRuleDto) => create<FormPriceRule, CreateFormPriceRuleDto>('/calculation-settings/form-prices', dto),
    update: (id: string, dto: UpdateFormPriceRuleDto) => update<FormPriceRule, UpdateFormPriceRuleDto>(`/calculation-settings/form-prices/${id}`, dto),
    remove: (id: string) => remove<FormPriceRule>(`/calculation-settings/form-prices/${id}`)
  },
  servicePrices: {
    list: (query: ListQuery = {}) => list<ServicePriceRule>('/calculation-settings/service-prices', query),
    get: (id: string) => get<ServicePriceRule>(`/calculation-settings/service-prices/${id}`),
    create: (dto: CreateServicePriceRuleDto) => create<ServicePriceRule, CreateServicePriceRuleDto>('/calculation-settings/service-prices', dto),
    update: (id: string, dto: UpdateServicePriceRuleDto) => update<ServicePriceRule, UpdateServicePriceRuleDto>(`/calculation-settings/service-prices/${id}`, dto),
    remove: (id: string) => remove<ServicePriceRule>(`/calculation-settings/service-prices/${id}`)
  }
};
