import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

export class NotEnoughStockException extends BadRequestException {
  constructor(message = 'Not enough stock available') {
    super(message);
  }
}

export class InvalidOrderStatusTransitionException extends BadRequestException {
  constructor(currentStatus: OrderStatus, nextStatus: OrderStatus) {
    super(`Invalid order status transition from "${currentStatus}" to "${nextStatus}"`);
  }
}

export class InvoiceOverpaymentException extends BadRequestException {
  constructor(message = 'Invoice overpayment is not allowed') {
    super(message);
  }
}

export class ReservationAlreadyConsumedException extends BadRequestException {
  constructor(message = 'Reservation already consumed') {
    super(message);
  }
}

export class PaymentAlreadyReversedException extends BadRequestException {
  constructor(message = 'Payment already reversed') {
    super(message);
  }
}
