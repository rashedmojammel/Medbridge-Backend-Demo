import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicines } from '../medicines/medicines.entity';
import { Orders } from './orders.entity';

@Entity()
export class OrderItems {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Orders, (order) => order.items, { onDelete: 'CASCADE' })
  order: Orders;

  @ManyToOne(() => Medicines, { eager: true })
  medicine: Medicines;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: string;
}