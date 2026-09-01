import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../users/users.entity';

/** Single-use, time-limited reset tokens. The raw token is never stored. */
@Entity()
export class PasswordResets {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  user: Users;

  @Index()
  @Column()
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
