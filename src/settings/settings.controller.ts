import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dtos/update-setting.dto';

@ApiTags('System settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Public: only the values a client legitimately needs before login. */
  @Get('public')
  publicSettings() {
    return {
      platformName: this.settingsService.getString('platform.name', 'Medbridge'),
      announcement: this.settingsService.getString('platform.announcement', ''),
      supportEmail: this.settingsService.getString('platform.supportEmail', ''),
    };
  }

  /** The thresholds the triage form uses to colour vitals live. */
  @Get('triage-thresholds')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('access-token')
  thresholds() {
    return this.settingsService.triageThresholds();
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  findAll(@Query('category') category?: string) {
    return this.settingsService.findAll(category);
  }

  @Put()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
