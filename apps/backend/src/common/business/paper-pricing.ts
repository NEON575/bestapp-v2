export function calculatePaperPricePerSheet(packPrice: number, sheetsInPack: number) {
  if (sheetsInPack <= 0) {
    return 0;
  }

  return Math.round((packPrice / sheetsInPack) * 10000) / 10000;
}
