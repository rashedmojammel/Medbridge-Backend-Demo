import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwtGuard';
import { LoginDto } from './dtos/login.dto';
import { RegisterPatientDto } from './dtos/register-patient.dto';
import { PasswordService } from './password.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dtos/password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
  ) {}

  /** #1 Public - patient self-registration */
  @Post('register')
  register(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto);
  }

  /** #2 Public - login with email + password */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** #3 Current user from token */
  @Get('me')
  @UseGuards(JwtGuard)
  me(@Req() req: any) {
    return req.user;
  }

  // ---- password management ----

  /** Signed-in user changes their own password. */
  @Patch('change-password')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('access-token')
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.passwordService.changePassword(req.user.id, dto, req.user);
  }

  /**
   * Public. Always returns the same message regardless of whether the email
   * exists, so it cannot be used to enumerate registered accounts.
   */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto.email);
  }

  /** Public. Consumes a single-use token issued by forgot-password. */
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }
}
