import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';
import { TemplateItems } from './template-items.entity';

/**
 * A saved set of medicines a doctor prescribes repeatedly (viral fever,
 * hypertension follow-up, etc.). Applying one prefills the prescription form;
 * the doctor still reviews and submits, so nothing is auto-prescribed.
 */
@Entity()
export class PrescriptionTemplates {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  doctor: Users;

  @Column()
  name: string;

  @Column({ nullable: true })
  condition: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: false })
  isShared: boolean; // visible to other doctors

  @Column({ default: 0 })
  useCount: number;

  @OneToMany(() => TemplateItems, (i) => i.template, { cascade: true, eager: true })
  items: TemplateItems[];

  @CreateDateColumn()
  createdAt: Date;
}
