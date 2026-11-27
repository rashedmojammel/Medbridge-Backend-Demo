import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MedicineInventory } from './medicine-inventory.entity';

@Entity()
export class Medicines {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brandName: string;

  @Column()
  genericName: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column()
  dosageForm: string; // TABLET | SYRUP | INJECTION | DROPS

  @Column()
  strength: string;

  @Column({ nullable: true })
  therapeuticClass: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  /** Product photo, set by a pharmacist. Falls back to a dosage-form icon
   *  on the frontend when not set. */
  @Column({ nullable: true })
  imageUrl: string;

  @OneToOne(() => MedicineInventory, (i) => i.medicine, { eager: true })
  inventory: MedicineInventory;
}