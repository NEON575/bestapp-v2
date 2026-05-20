export const salesPaymentTypeLabels: Record<string, string> = {
  hesab: 'Hesab',
  kart: 'Kart',
  negd: 'Nəğd',
  kassa: 'Kassa'
};

export const salesDeliveryStatusLabels: Record<string, string> = {
  sifaris: 'Sifariş',
  hazir: 'Hazır',
  tehvil: 'Təhvil',
  legv: 'Ləğv'
};

export const salesProductionStageLabels: Record<string, string> = {
  dizayn: 'Dizayn',
  forma: 'Forma',
  cap: 'Çap',
  laminasiya: 'Laminasiya',
  kesim: 'Kəsim',
  el_isi: 'Əl işi',
  bitib: 'Bitib',
  odenis: 'Ödəniş',
  poni: 'Poni',
  ozel_kesim: 'Özəl kəsim'
};

export const salesQaimaLabels: Record<string, string> = {
  yazilib: 'Yazılıb',
  yazilmayib: 'Yazılmayıb',
  negd: 'Nəğd'
};

export const salesPaymentStatusLabels: Record<string, string> = {
  odenilib: 'Ödənilib',
  yazilib: 'Yazılıb'
};

export function getSalesLabel(map: Record<string, string>, value?: string | null, fallback = '—') {
  if (!value) {
    return fallback;
  }

  return map[value] ?? value;
}
