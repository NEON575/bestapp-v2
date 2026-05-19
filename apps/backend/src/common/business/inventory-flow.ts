export function calculateStockSnapshot(input: {
  onHand: number;
  reserved: number;
}) {
  const available = input.onHand - input.reserved;
  return {
    onHand: input.onHand,
    reserved: input.reserved,
    available
  };
}

export function applyReserve(input: { onHand: number; reserved: number }, quantity: number) {
  const reserved = input.reserved + quantity;
  return calculateStockSnapshot({
    onHand: input.onHand,
    reserved
  });
}

export function applyRelease(input: { onHand: number; reserved: number }, quantity: number) {
  const reserved = Math.max(input.reserved - quantity, 0);
  return calculateStockSnapshot({
    onHand: input.onHand,
    reserved
  });
}

export function applyConsume(input: { onHand: number; reserved: number }, quantity: number) {
  const onHand = input.onHand - quantity;
  const reserved = Math.max(input.reserved - quantity, 0);
  return calculateStockSnapshot({ onHand, reserved });
}
