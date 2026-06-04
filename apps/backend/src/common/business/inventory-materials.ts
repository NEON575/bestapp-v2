type InventoryMaterialLike = {
  available: number;
  onHand: number;
  minStockLevel: number;
};

export function filterInventoryMaterials<T extends InventoryMaterialLike>(
  materials: T[],
  query: {
    lowStockOnly?: boolean;
    stockState?: 'positive' | 'zero';
  }
) {
  return materials.filter((material) => {
    if (query.lowStockOnly && !(material.available <= material.minStockLevel)) {
      return false;
    }

    if (query.stockState === 'positive' && !(material.onHand > 0)) {
      return false;
    }

    if (query.stockState === 'zero' && material.onHand !== 0) {
      return false;
    }

    return true;
  });
}
