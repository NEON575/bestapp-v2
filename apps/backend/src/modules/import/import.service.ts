import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

const expectedSheetColumns: Record<string, string[]> = {
  'Satış': ['Tarix', 'Müştəri', 'Menecer', 'Kateqoriya', 'Məhsul', 'Say', 'Satış məb.', 'Ödəniş', 'Qalıq', 'Xeyir'],
  'Alış': ['Tarix', 'Təchizatçı', 'Alış Məbləğ', 'Ödəniş', 'Qalıq borc'],
  'Maaş': ['Tarix', 'Ad', 'Maaş', 'Bonus', 'Ödəniş', 'Qalıq'],
  'Kağız': ['kod', 'ad', 'qram', 'razmer', 'qiymət']
};

function normalizeCell(value: unknown) {
  return String(value ?? '').trim();
}

function extractColumns(rows: unknown[][]) {
  const firstDataRow = rows.find((row) => row.some((cell) => normalizeCell(cell)));
  return (firstDataRow ?? []).map((cell) => normalizeCell(cell)).filter(Boolean);
}

@Injectable()
export class ImportService {
  previewExcel(file: UploadedExcelFile) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheets = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
        const columns = extractColumns(rows);
        const expected = expectedSheetColumns[sheetName] ?? [];
        const mappingErrors = expected.filter((column) => !columns.includes(column)).map((column) => `Kolonka tapılmadı: ${column}`);

        return {
          name: sheetName,
          rows: Math.max(rows.length - 1, 0),
          columns,
          mappingErrors
        };
      });

      return {
        fileName: file.originalname,
        sheets,
        workbookError: null
      };
    } catch (error) {
      return {
        fileName: file.originalname,
        sheets: [],
        workbookError: error instanceof Error ? error.message : 'Excel faylı oxunmadı'
      };
    }
  }
}
