import type {
  AppPreferences,
  CompanySettings,
  CreateUnitDto,
  CreateSystemOptionDto,
  SettingUnitItem,
  SettingsReferenceGroup,
  SettingsReferenceOptions,
  UpdateAppPreferencesDto,
  UpdateCompanySettingsDto,
  UpdateUnitDto,
  UpdateSystemOptionDto
} from '@bestapp/shared';
import { api } from './http';

export const settingsClient = {
  async company() {
    const { data } = await api.get<CompanySettings>('/settings/company');
    return data;
  },

  async updateCompany(dto: UpdateCompanySettingsDto) {
    const { data } = await api.patch<CompanySettings>('/settings/company', dto);
    return data;
  },

  async preferences() {
    const { data } = await api.get<AppPreferences>('/settings/preferences');
    return data;
  },

  async updatePreferences(dto: UpdateAppPreferencesDto) {
    const { data } = await api.patch<AppPreferences>('/settings/preferences', dto);
    return data;
  },

  async referenceOptions() {
    const { data } = await api.get<SettingsReferenceOptions>('/settings/reference-options');
    return data;
  },

  async references() {
    const { data } = await api.get<{ groups: SettingsReferenceGroup[] }>('/settings/references');
    return data;
  },

  async units() {
    const { data } = await api.get<SettingUnitItem[]>('/settings/units');
    return data;
  },

  async createUnit(dto: CreateUnitDto) {
    const { data } = await api.post<SettingUnitItem>('/settings/units', dto);
    return data;
  },

  async updateUnit(id: string, dto: UpdateUnitDto) {
    const { data } = await api.patch<SettingUnitItem>(`/settings/units/${id}`, dto);
    return data;
  },

  async activateUnit(id: string) {
    const { data } = await api.post<SettingUnitItem>(`/settings/units/${id}/activate`);
    return data;
  },

  async deactivateUnit(id: string) {
    const { data } = await api.post<SettingUnitItem>(`/settings/units/${id}/deactivate`);
    return data;
  },

  async removeUnit(id: string) {
    const { data } = await api.delete<SettingUnitItem>(`/settings/units/${id}`);
    return data;
  },

  async createReference(dto: CreateSystemOptionDto) {
    const { data } = await api.post('/settings/references', dto);
    return data;
  },

  async updateReference(id: string, dto: UpdateSystemOptionDto) {
    const { data } = await api.patch(`/settings/references/${id}`, dto);
    return data;
  },

  async removeReference(id: string) {
    const { data } = await api.delete(`/settings/references/${id}`);
    return data;
  }
};
