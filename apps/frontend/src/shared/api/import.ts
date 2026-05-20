import type { ExcelImportPreviewResult } from '@bestapp/shared';
import { api } from './http';

export const importClient = {
  async previewExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ExcelImportPreviewResult>('/import/excel/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  }
};
