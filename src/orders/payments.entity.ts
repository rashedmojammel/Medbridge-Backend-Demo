import {
  Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from '../auth/user-role.enum';
import { Orders } from './orders.entity';

@Entity()
export class Payments {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Orders, { eager: true })
  @JoinColumn()
  order: Orders;

  @Column({ nullable: true })
  sslczValId: string;

  @Column({ nullable: true })
  sslczBankTranId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}