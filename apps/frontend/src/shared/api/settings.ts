import type { CompanySettings, SettingsReferenceOptions, UpdateCompanySettingsDto } from '@bestapp/shared';
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

  async referenceOptions() {
    const { data } = await api.get<SettingsReferenceOptions>('/settings/reference-options');
    return data;
  }
};
