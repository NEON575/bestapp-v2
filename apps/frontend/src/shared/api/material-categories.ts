import { api } from './http';
import type {
  MaterialCategoryItem,
  MaterialCategoryParameterItem,
  MaterialCategoryParameterValueItem
} from '../materials';

export interface CreateMaterialCategoryParameterDto {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateMaterialCategoryParameterDto extends Partial<CreateMaterialCategoryParameterDto> {}

export interface CreateMaterialCategoryParameterValueDto {
  value: string;
  sortOrder?: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateMaterialCategoryParameterValueDto extends Partial<CreateMaterialCategoryParameterValueDto> {}

export const materialCategoriesClient = {
  async list() {
    const { data } = await api.get<MaterialCategoryItem[]>('/material-categories');
    return data;
  },

  async listParameters(categoryId: string) {
    const { data } = await api.get<MaterialCategoryParameterItem[]>(`/material-categories/${categoryId}/parameters`);
    return data;
  },

  async createParameter(categoryId: string, dto: CreateMaterialCategoryParameterDto) {
    const { data } = await api.post<MaterialCategoryParameterItem>(`/material-categories/${categoryId}/parameters`, dto);
    return data;
  },

  async updateParameter(id: string, dto: UpdateMaterialCategoryParameterDto) {
    const { data } = await api.patch<MaterialCategoryParameterItem>(`/material-category-parameters/${id}`, dto);
    return data;
  },

  async removeParameter(id: string) {
    const { data } = await api.delete<MaterialCategoryParameterItem>(`/material-category-parameters/${id}`);
    return data;
  },

  async listValues(parameterId: string) {
    const { data } = await api.get<MaterialCategoryParameterValueItem[]>(`/material-category-parameters/${parameterId}/values`);
    return data;
  },

  async createValue(parameterId: string, dto: CreateMaterialCategoryParameterValueDto) {
    const { data } = await api.post<MaterialCategoryParameterValueItem>(`/material-category-parameters/${parameterId}/values`, dto);
    return data;
  },

  async updateValue(id: string, dto: UpdateMaterialCategoryParameterValueDto) {
    const { data } = await api.patch<MaterialCategoryParameterValueItem>(`/material-category-parameter-values/${id}`, dto);
    return data;
  },

  async removeValue(id: string) {
    const { data } = await api.delete<MaterialCategoryParameterValueItem>(`/material-category-parameter-values/${id}`);
    return data;
  }
};

