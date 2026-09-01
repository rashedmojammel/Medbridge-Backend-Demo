import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../users/users.entity';
import { Consultations } from './consultations.entity';

/** Append-only: the chat transcript is the permanent clinical record */
@Entity()
export class ChatMessages {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Consultations, (c) => c.messages, { onDelete: 'CASCADE' })
  consultation: Consultations;

  @ManyToOne(() => Users, { eager: true })
  sender: Users;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn()
  sentAt: Date;
}
