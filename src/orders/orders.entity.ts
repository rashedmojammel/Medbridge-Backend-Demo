import {
  Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { FulfillmentStatus, OrderStatus } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { OrderItems } from './order-items.entity';

@Entity()
export class Orders {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: string;

  /** Payment status - set by the SSLCommerz IPN, never by a pharmacist directly. */
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  /** Physical hand-over status - separate from payment. Only a PAID order can
   *  ever move to FULFILLED; this is what the pharmacist actually controls. */
  @Column({ type: 'enum', enum: FulfillmentStatus, default: FulfillmentStatus.UNFULFILLED })
  fulfillmentStatus: FulfillmentStatus;

  @ManyToOne(() => Users, { nullable: true })
  fulfilledBy: Users;

  @Column({ nullable: true })
  fulfilledAt: Date;

  @Column({ unique: true })
  tranId: string;

  @OneToMany(() => OrderItems, (item) => item.order)
  items: OrderItems[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}