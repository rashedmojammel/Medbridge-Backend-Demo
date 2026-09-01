import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { AuditAction, UserRole } from '../auth/user-role.enum';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@UseGuards(JwtGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Admin-only. Filterable, paginated audit trail. */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('resource') resource?: string,
    @Query('action') action?: AuditAction,
    @Query('actorId') actorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      resource,
      action,
      actorId: actorId ? Number(actorId) : undefined,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
