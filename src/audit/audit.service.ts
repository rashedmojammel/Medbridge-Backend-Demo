import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuditAction, UserRole } from '../auth/user-role.enum';
import { AuditLogs } from './audit-logs.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogs) private auditRepo: Repository<AuditLogs>,
  ) {}

  /**
   * Fire-and-forget on purpose. An audit write must never fail the request
   * that triggered it, so failures are logged rather than thrown.
   */
  record(params: {
    actor?: { id: number; email?: string; role?: string };
    action: AuditAction;
    resource: string;
    resourceId?: number;
    detail?: string;
    ip?: string;
  }) {
    const row = this.auditRepo.create({
      actor: params.actor?.id ? ({ id: params.actor.id } as any) : null,
      actorEmail: params.actor?.email,
      actorRole: params.actor?.role,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      detail: params.detail,
      ip: params.ip,
    });

    this.auditRepo
      .save(row)
      .catch((err) => this.logger.error(`Audit write failed: ${err.message}`));
  }

  async findAll(query: {
    resource?: string;
    action?: AuditAction;
    actorId?: number;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Number(query.limit) || 50);

    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.resource) qb.andWhere('a.resource = :r', { r: query.resource });
    if (query.action) qb.andWhere('a.action = :ac', { ac: query.action });
    if (query.actorId) qb.andWhere('actor.id = :aid', { aid: query.actorId });
    if (query.from) qb.andWhere('a.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('a.createdAt <= :to', { to: new Date(query.to) });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}
