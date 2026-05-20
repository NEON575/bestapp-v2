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
  'Kağız': ['kod', 'ad', 'qram', 'razmer', 'qiymət'],
  'Məhsul': ['təchizatçı', 'material', 'kateqoriya', 'qiymət', 'vahid']
};

function normalizeCell(value: unknown) {
  return String(value ?? '').trim();
}

function extractColumns(rows: unknown[][]) {
  const firstDataRow = rows.find((row) => row.some((cell) => normalizeCell(cell)));
  return (firstDataRow ?? []).map((cell) => normalizeCell(cell)).filter(Boolean);
}

function sampleRows(columns: string[], rows: unknown[][]) {
  const body = rows.slice(1, 6);
  return body.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[column] = row[index] ?? '';
    });
    return record;
  });
}

function calculateConfidence(expected: string[], actual: string[]) {
  if (!expected.length) {
    return actual.length ? 100 : 0;
  }

  const matched = expected.filter((column) => actual.includes(column)).length;
  return Math.round((matched / expected.length) * 100);
}

@Injectable()
export class ImportService {
  previewExcel(file: UploadedExcelFile) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const workbookSheets = new Set(workbook.SheetNames);

      const sheets = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
        const columns = extractColumns(rows);
        const expected = expectedSheetColumns[sheetName] ?? [];
        const mappingErrors = expected
          .filter((column) => !columns.includes(column))
          .map((column) => `Kolonka tapılmadı: ${column}`);

        if (sheetName === 'Kağız') {
          mappingErrors.push('Target: Materiallar / Kağız kateqoriyası');
        }

        if (sheetName === 'Məhsul') {
          mappingErrors.push('Target: Materiallar / uyğun kateqoriya');
        }

        const confidence = calculateConfidence(expected, columns);

        return {
          name: sheetName,
          found: true,
          rows: Math.max(rows.length - 1, 0),
          columns,
          mappingErrors,
          confidence,
          sampleRows: sampleRows(columns, rows)
        };
      });

      const requiredSheets = Object.entries(expectedSheetColumns).map(([name, expected]) => {
        const found = workbookSheets.has(name);
        const current = sheets.find((sheet) => sheet.name === name);
        return {
          name,
          found,
          confidence: found ? current?.confidence ?? calculateConfidence(expected, current?.columns ?? []) : 0
        };
      });

      return {
        fileName: file.originalname,
        sheets,
        requiredSheets,
        workbookError: null
      };
    } catch (error) {
      return {
        fileName: file.originalname,
        sheets: [],
        requiredSheets: Object.keys(expectedSheetColumns).map((name) => ({
          name,
          found: false,
          confidence: 0
        })),
        workbookError: error instanceof Error ? error.message : 'Excel faylı oxunmadı'
      };
    }
  }
}
