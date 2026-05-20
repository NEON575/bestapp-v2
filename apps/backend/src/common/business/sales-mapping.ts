import { OrderStatus } from '@prisma/client';

export function mapOrderStatusToSalesDeliveryStatus(status: OrderStatus) {
  switch (status) {
    case OrderStatus.ready:
      return 'hazir';
    case OrderStatus.delivered:
      return 'tehvil';
    case OrderStatus.cancelled:
      return 'legv';
    default:
      return 'sifaris';
  }
}

export function mapOrderStatusToProductionStage(status: OrderStatus) {
  switch (status) {
    case OrderStatus.approved:
      return 'dizayn';
    case OrderStatus.in_production:
      return 'cap';
    case OrderStatus.ready:
      return 'bitib';
    case OrderStatus.delivered:
      return 'odenis';
    default:
      return undefined;
  }
}

