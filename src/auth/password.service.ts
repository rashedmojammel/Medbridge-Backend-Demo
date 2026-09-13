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
import { MailService } from '../mail/mail.service';
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
    private mailService: MailService,
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

    await this.mailService.send(
      [user.email],
      'Reset your Medbridge password',
      this.buildResetEmail(user.fullName, link),
    );

    this.logger.log(`Password reset email dispatched to ${email}`);

    return generic;
  }

  private buildResetEmail(fullName: string, link: string): string {
    return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background-color:#2563eb;padding:20px 28px;">
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">Medbridge</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#334155;">
                  Hi ${fullName},
                </p>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#334155;">
                  We received a request to reset your Medbridge password. This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email - your password won't be changed.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:6px;background-color:#2563eb;">
                      <a href="${link}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <a href="${link}" style="color:#2563eb;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
                  Sent automatically by Medbridge. Please do not reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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