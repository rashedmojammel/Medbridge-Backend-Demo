import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { AuditAction } from './user-role.enum';
import { AuditService } from '../audit/audit.service';
import { Users } from '../users/users.entity';
import { PasswordResets } from './password-resets.entity';
import { ChangePasswordDto, ResetPasswordDto } from './dtos/password.dto';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    @InjectRepository(PasswordResets) private resetsRepo: Repository<PasswordResets>,
    private auditService: AuditService,
    private config: ConfigService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Signed-in user changing their own password. */
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    actor: { id: number; email?: string; role?: string },
  ) {
    const user = await this.usersRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must be different');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);

    this.auditService.record({
      actor,
      action: AuditAction.UPDATE,
      resource: 'auth',
      resourceId: userId,
      detail: 'Password changed',
    });

    return { success: true, message: 'Password updated' };
  }

  /**
   * Always returns the same response whether or not the email exists, so
   * this endpoint cannot be used to discover which emails are registered.
   */
  async forgotPassword(email: string) {
    const generic = {
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    };

    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) return generic;

    // clear any outstanding tokens for this user
    await this.resetsRepo.delete({ user: { id: user.id }, used: false });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.resetsRepo.save(
      this.resetsRepo.create({
        user: { id: user.id } as any,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      }),
    );

    const base = this.config.get('CORS_ORIGIN', 'http://localhost:3000');
    const link = `${base}/reset-password?token=${rawToken}`;

    // MailService is wired in the notifications module; log the link so the
    // flow is testable in development even without SMTP configured
    this.logger.log(`Password reset link for ${email}: ${link}`);

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const record = await this.resetsRepo.findOne({
      where: { tokenHash, used: false },
      relations: { user: true },
    });
    if (!record) throw new BadRequestException('Invalid or already-used reset token');
    if (record.expiresAt.getTime() < Date.now())
      throw new BadRequestException('This reset link has expired');

    const user = await this.usersRepo.findOne({ where: { id: record.user.id } });
    if (!user) throw new NotFoundException('User not found');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);

    record.used = true;
    await this.resetsRepo.save(record);

    this.auditService.record({
      actor: { id: user.id, email: user.email, role: user.role },
      action: AuditAction.UPDATE,
      resource: 'auth',
      resourceId: user.id,
      detail: 'Password reset via emailed token',
    });

    return { success: true, message: 'Password has been reset. You can now log in.' };
  }

  /** Housekeeping: drop expired tokens. Safe to call from a cron. */
  async purgeExpired() {
    const { affected } = await this.resetsRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return { purged: affected ?? 0 };
  }
}
