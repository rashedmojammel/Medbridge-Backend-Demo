import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medicines } from '../medicines/medicines.entity';
import { Patients } from '../patients/patients.entity';
import { OrderItems } from './order-items.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Orders } from './orders.entity';
import { Payments } from './payments.entity';
import { PaymentsController } from '../payments/payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Orders, OrderItems, Payments, Medicines, Patients])],
  controllers: [OrdersController, PaymentsController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}