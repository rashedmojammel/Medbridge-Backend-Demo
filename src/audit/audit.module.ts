import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogs } from './audit-logs.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * Global so any module can inject AuditService without importing this module.
 * Audit is cross-cutting - patients, prescriptions, users all write to it.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogs])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
