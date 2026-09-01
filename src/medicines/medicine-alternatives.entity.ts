import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicines } from './medicines.entity';

/** Explicit join entity - service writes both directions so the pair is symmetric */
@Entity()
export class MedicineAlternatives {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Medicines, { eager: true, onDelete: 'CASCADE' })
  medicine: Medicines;

  @ManyToOne(() => Medicines, { eager: true, onDelete: 'CASCADE' })
  alternative: Medicines;
}
