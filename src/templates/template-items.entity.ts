import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicines } from '../medicines/medicines.entity';
import { PrescriptionTemplates } from './prescription-templates.entity';

@Entity()
export class TemplateItems {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PrescriptionTemplates, (t) => t.items, { onDelete: 'CASCADE' })
  template: PrescriptionTemplates;

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
