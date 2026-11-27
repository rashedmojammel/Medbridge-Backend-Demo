import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FulfillmentStatus, NotificationType, OrderStatus, PaymentStatus } from '../auth/user-role.enum';
import { Medicines } from '../medicines/medicines.entity';
import { Patients } from '../patients/patients.entity';
import { OrderItems } from './order-items.entity';
import { Orders } from './orders.entity';
import { Payments } from './payments.entity';
import { CreateOrderDto } from './create-order.dto';
import { Notifications } from '../notifications/notifications.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Orders) private ordersRepo: Repository<Orders>,
    @InjectRepository(Medicines) private medicinesRepo: Repository<Medicines>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private dataSource: DataSource,
  ) {}
  async createOrder(dto: CreateOrderDto, patientUserId: number) {
    const patient = await this.patientsRepo.findOne({
      where: { user: { id: patientUserId } },
      relations: { user: true },
    });
    if (!patient) throw new NotFoundException('No patient record linked to this account');

    const medicines = await this.medicinesRepo.findByIds(dto.items.map((i) => i.medicineId));
    if (medicines.length !== dto.items.length) {
      throw new BadRequestException('One or more medicines could not be found');
    }

    let total = 0;
    const itemRows = dto.items.map((item) => {
      const medicine = medicines.find((m) => m.id === item.medicineId)!;
      if (!medicine.isAvailable) {
        throw new BadRequestException(`${medicine.brandName} is not currently available`);
      }
      const unitPrice = Number(medicine.price);
      total += unitPrice * item.quantity;
      return { medicine, quantity: item.quantity, unitPrice: unitPrice.toFixed(2) };
    });

    const tranId = `MB-${randomUUID()}`;

    const order = await this.dataSource.transaction(async (manager) => {
      const savedOrder = await manager.save(
        manager.create(Orders, {
          patient,
          totalAmount: total.toFixed(2),
          status: OrderStatus.PENDING,
          tranId,
        }),
      );
      await manager.save(
        itemRows.map((row) => manager.create(OrderItems, { order: savedOrder, ...row })),
      );
      await manager.save(
        manager.create(Payments, {
          order: savedOrder,
          amount: total.toFixed(2),
          status: PaymentStatus.INITIATED,
        }),
      );
      return savedOrder;
    });

    const gatewayUrl = await this.initSslcommerzSession(order, patient);
    return { orderId: order.id, gatewayUrl };
  }

  /** Talks to SSLCommerz's session-init API, returns the page the patient
   *  is redirected to in order to actually pay. */
  private async initSslcommerzSession(order: Orders, patient: Patients) {
    const storeId = process.env.SSLCZ_STORE_ID;
    const storePassword = process.env.SSLCZ_STORE_PASSWORD;
    const isLive = process.env.SSLCZ_IS_LIVE === 'true';
    const apiUrl = isLive
      ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

    const backendUrl = process.env.APP_BASE_URL; // e.g. https://medbridge-backend-demo.onrender.com
    const frontendUrl = process.env.CORS_ORIGIN;  // e.g. https://medbridgecare.vercel.app

    const body = new URLSearchParams({
      store_id: storeId!,
      store_passwd: storePassword!,
      total_amount: order.totalAmount,
      currency: 'BDT',
      tran_id: order.tranId,
      success_url: `${backendUrl}/payments/success`,
      fail_url: `${backendUrl}/payments/fail`,
      cancel_url: `${backendUrl}/payments/cancel`,
      ipn_url: `${backendUrl}/payments/ipn`,
      cus_name: patient.fullName,
      cus_email: patient.user?.email ?? 'no-reply@medbridge.local',
      cus_phone: patient.phone,
      cus_add1: patient.address,
      shipping_method: 'NO',
      product_name: 'Medicine order',
      product_category: 'Medicine',
      product_profile: 'general',
    });

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();

    if (data.status !== 'SUCCESS') {
      throw new BadRequestException('Could not start the payment session');
    }
    return data.GatewayPageURL as string;
  }

  /**
   * Confirms a payment against SSLCommerz's own Validation API and marks the
   * order PAID. Called from BOTH the IPN and the browser-return callback, so it
   * is safe to call repeatedly: an already-PAID order returns immediately.
   * Nothing in the posted payload is trusted except val_id, which is only ever
   * used as a lookup key for SSLCommerz's answer.
   */
  async confirmPayment(payload: Record<string, string>): Promise<boolean> {
    const order = await this.ordersRepo.findOne({ where: { tranId: payload.tran_id } });
    if (!order) return false;
    if (order.status === OrderStatus.PAID) return true;
    if (!payload.val_id) return false;

    let verified: any;
    try {
      verified = await this.verifyWithSslcommerz(payload.val_id);
    } catch (err) {
      this.logger.error(`Could not reach SSLCommerz validation API: ${err.message}`);
      return false;
    }

    const statusOk = verified?.status === 'VALID' || verified?.status === 'VALIDATED';
    const tranOk = verified?.tran_id === order.tranId;
    const amountOk = Number(verified?.amount) === Number(order.totalAmount);

    if (!statusOk || !tranOk || !amountOk) {
      this.logger.warn(
        `Payment for ${order.tranId} not confirmed: status=${verified?.status}, ` +
          `tranMatch=${tranOk}, amountMatch=${amountOk} ` +
          `(got ${verified?.amount}, expected ${order.totalAmount})`,
      );
      return false;
    }

    await this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.PAID;
      await manager.save(order);

      const payment = await manager.findOne(Payments, { where: { order: { id: order.id } } });
      if (payment) {
        payment.status = PaymentStatus.VALID;
        payment.sslczValId = payload.val_id;
        payment.sslczBankTranId = payload.bank_tran_id ?? verified.bank_tran_id;
        payment.paidAt = new Date();
        await manager.save(payment);
      }
    });
    return true;
  }

  /** Fail/cancel callbacks only touch orders that are still PENDING, so a late
   *  or replayed callback can never downgrade an order that was already paid. */
  async markUnpaid(
    tranId: string | undefined,
    status: OrderStatus.FAILED | OrderStatus.CANCELLED,
  ) {
    if (!tranId) return;
    const order = await this.ordersRepo.findOne({ where: { tranId } });
    if (order && order.status === OrderStatus.PENDING) {
      order.status = status;
      await this.ordersRepo.save(order);
    }
  }

  /** Independent server-to-server confirmation - the whole point of this
   *  call is that the posted body alone cannot be trusted. */
  private async verifyWithSslcommerz(valId: string) {
    const storeId = process.env.SSLCZ_STORE_ID;
    const storePassword = process.env.SSLCZ_STORE_PASSWORD;
    const isLive = process.env.SSLCZ_IS_LIVE === 'true';
    const base = isLive
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com';

    const url = `${base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${storeId}&store_passwd=${storePassword}&format=json`;
    const res = await fetch(url);
    return res.json();
  }

  async findMine(patientUserId: number) {
    return this.ordersRepo.find({
      where: { patient: { user: { id: patientUserId } } },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(status?: OrderStatus) {
    return this.ordersRepo.find({
      where: status ? { status } : {},
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  async markFulfilled(orderId: number, pharmacistId: number) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Orders, {
        where: { id: orderId },
        relations: { patient: { user: true } },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException('Only paid orders can be marked as fulfilled');
      }
      if (order.fulfillmentStatus === FulfillmentStatus.FULFILLED) {
        throw new BadRequestException('This order has already been fulfilled');
      }

      order.fulfillmentStatus = FulfillmentStatus.FULFILLED;
      order.fulfilledBy = { id: pharmacistId } as any;
      order.fulfilledAt = new Date();
      const saved = await manager.save(order);

      if (order.patient.user) {
        await manager.save(
          manager.create(Notifications, {
            user: order.patient.user,
            type: NotificationType.PRESCRIPTION_READY,
            title: 'Order ready for collection',
            body: `Your order #${order.id} (${order.totalAmount} BDT) is ready to collect from the pharmacy.`,
            refId: order.id,
            isRead: false,
          }),
        );
      }

      return saved;
    });
  }
}