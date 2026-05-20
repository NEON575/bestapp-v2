import { useState } from 'react';
import type { ExcelImportPreviewResult } from '@bestapp/shared';
import { Button } from '@bestapp/ui';
import { importClient } from '../shared/api/import';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../shared/components';

function sheetTargetLabel(name: string) {
  if (name === 'Kağız') {
    return 'Materiallar / Kağız kateqoriyası';
  }

  if (name === 'Məhsul') {
    return 'Materiallar / uyğun kateqoriya';
  }

  if (name === 'Satış') {
    return 'Satış əsas jurnal';
  }

  return name;
}

export function ImportExcelPage() {
  const [preview, setPreview] = useState<ExcelImportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await importClient.previewExcel(file);
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excel preview alınmadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Import Excel" description="BestApp.xlsm faylı üçün preview, mapping status və ilk sətirlər." />

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-start gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">BestApp.xlsm preview</h2>
            <p className="mt-1 text-sm text-slate-500">Hələ final import yoxdur. Bu mərhələdə əsas vərəqlər, confidence və nümunə sətirlər göstərilir.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFile(file);
                }
              }}
            />
            Excel faylı seç
          </label>
        </div>
      </div>

      {loading ? <LoadingState rows={4} /> : null}
      {error ? <ErrorState description={error} /> : null}
      {!loading && !error && !preview ? <EmptyState title="Preview yoxdur" description="BestApp.xlsm faylı seçdikdən sonra nəticə burada görünəcək." /> : null}

      {preview ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-sm text-slate-500">Fayl</div>
            <div className="mt-1 text-sm font-semibold text-slate-950">{preview.fileName}</div>
            {preview.workbookError ? <div className="mt-2 text-sm text-rose-600">{preview.workbookError}</div> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(preview.requiredSheets ?? []).map((sheet) => (
              <div key={sheet.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-950">{sheet.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{sheetTargetLabel(sheet.name)}</div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${sheet.found ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {sheet.found ? 'Tapıldı' : 'Tapılmadı'}
                  </span>
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">Mapping confidence</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{sheet.confidence}%</div>
              </div>
            ))}
          </div>

          {preview.sheets.map((sheet) => (
            <div key={sheet.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{sheet.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{sheetTargetLabel(sheet.name)}</p>
                  <p className="mt-1 text-sm text-slate-500">{sheet.rows} sətir aşkarlandı • confidence {sheet.confidence ?? 0}%</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(sheet.confidence ?? 0) >= 80 ? 'bg-emerald-50 text-emerald-700' : (sheet.confidence ?? 0) >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                  {(sheet.confidence ?? 0) >= 80 ? 'Yaxşı uyğunluq' : (sheet.confidence ?? 0) >= 50 ? 'Orta uyğunluq' : 'Aşağı uyğunluq'}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kolonkalar</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sheet.columns.map((column) => (
                    <span key={column} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                      {column}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Mapping status</div>
                {!sheet.mappingErrors.length ? (
                  <div className="mt-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Əsas mapping xətası tapılmadı.</div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {sheet.mappingErrors.map((message) => (
                      <div key={message} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {message}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">İlk 5 sətir preview</div>
                {!sheet.sampleRows?.length ? (
                  <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Preview sətiri tapılmadı.</div>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          {sheet.columns.map((column) => (
                            <th key={column} className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.sampleRows.map((row, index) => (
                          <tr key={`${sheet.name}-${index}`} className="border-b border-slate-100">
                            {sheet.columns.map((column) => (
                              <td key={`${sheet.name}-${index}-${column}`} className="px-3 py-2 text-slate-700">
                                {String(row[column] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
