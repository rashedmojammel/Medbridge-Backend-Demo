import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicines } from '../medicines/medicines.entity';
import { Prescriptions } from './prescriptions.entity';

@Entity()
export class PrescriptionItems {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prescriptions, (p) => p.items, { onDelete: 'CASCADE' })
  prescription: Prescriptions;

  @ManyToOne(() => Medicines, { eager: true })
  medicine: Medicines;

  @Column()
  dosage: string;

  @Column()
  frequency: string;

  @Column()
  duration: string;

  @Column({ default: 'ORAL' })
  route: string;

  @Column({ nullable: true })
  instructions: string;
}
