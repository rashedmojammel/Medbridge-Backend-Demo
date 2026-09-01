import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction } from '../auth/user-role.enum';
import { Users } from '../users/users.entity';

/**
 * Append-only record of who touched which patient data and when.
 * Healthcare systems are expected to be able to answer that question,
 * so there is deliberately no update or delete path for these rows.
 */
@Entity()
export class AuditLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  actor: Users;

  @Column({ nullable: true })
  actorEmail: string; // kept verbatim so the trail survives user deletion

  @Column({ nullable: true })
  actorRole: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Index()
  @Column()
  resource: string; // 'patients' | 'prescriptions' | ...

  @Column({ nullable: true })
  resourceId: number;

  @Column({ type: 'text', nullable: true })
  detail: string;

  @Column({ nullable: true })
  ip: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
