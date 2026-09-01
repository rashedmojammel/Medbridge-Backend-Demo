import {
  Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';
import { Medicines } from './medicines.entity';

@Entity()
export class MedicineInventory {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Medicines, (m) => m.inventory, { onDelete: 'CASCADE' })
  @JoinColumn()
  medicine: Medicines;

  @Column({ default: 0 })
  stockQty: number;

  @Column({ default: 10 })
  threshold: number;

  @ManyToOne(() => Users, { nullable: true })
  updatedBy: Users;

  @UpdateDateColumn()
  updatedAt: Date;
}
