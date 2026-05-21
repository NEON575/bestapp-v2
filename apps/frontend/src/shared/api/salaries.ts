import type {
  CreateEmployeeDto,
  CreateSalaryEntryDto,
  EmployeeItem,
  PaginatedResponse,
  SalaryEntryItem,
  SalaryEntryQueryDto,
  SalaryTotalsSummary,
  UpdateEmployeeDto,
  UpdateSalaryEntryDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const salariesClient = {
  async list(query: SalaryEntryQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<SalaryEntryItem>>('/salaries', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async create(dto: CreateSalaryEntryDto) {
    const { data } = await api.post<SalaryEntryItem>('/salaries', dto);
    return data;
  },

  async quickCreate(dto: CreateSalaryEntryDto) {
    const { data } = await api.post<SalaryEntryItem>('/salaries/quick-create', dto);
    return data;
  },

  async update(id: string, dto: UpdateSalaryEntryDto) {
    const { data } = await api.patch<SalaryEntryItem>(`/salaries/${id}`, dto);
    return data;
  },

  async summary(query: SalaryEntryQueryDto = {}) {
    const { data } = await api.get<SalaryTotalsSummary>('/salaries/summary', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async listEmployees() {
    const { data } = await api.get<EmployeeItem[]>('/salaries/employees');
    return data;
  },

  async createEmployee(dto: CreateEmployeeDto) {
    const { data } = await api.post<EmployeeItem>('/salaries/employees', dto);
    return data;
  },

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const { data } = await api.patch<EmployeeItem>(`/salaries/employees/${id}`, dto);
    return data;
  },

  async removeEmployee(id: string) {
    const { data } = await api.delete<EmployeeItem>(`/salaries/employees/${id}`);
    return data;
  }
};
