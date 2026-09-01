import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicines } from '../medicines/medicines.entity';
import { Users } from '../users/users.entity';
import { Prescriptions } from './prescriptions.entity';

/**
 * One row per medicine actually handed to the patient. Separate from
 * prescription_items because a prescription can be dispensed partially
 * (pharmacy has 2 of the 3 medicines) and we need to know exactly what left
 * the shelf, when, and who released it.
 */
@Entity()
export class DispenseRecords {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prescriptions, { onDelete: 'CASCADE' })
  prescription: Prescriptions;

  @ManyToOne(() => Medicines, { eager: true })
  medicine: Medicines;

  @Column()
  quantity: number;

  @ManyToOne(() => Users, { eager: true })
  dispensedBy: Users;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  dispensedAt: Date;
}
