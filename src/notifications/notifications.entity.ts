import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../auth/user-role.enum';
import { Users } from '../users/users.entity';

@Entity()
export class Notifications {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, { eager: true, onDelete: 'CASCADE' })
  user: Users; // recipient

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ nullable: true })
  refId: number; // links to consultation/prescription/medicine/etc.

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
