import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@ApiBearerAuth('access-token')
@Controller('stats')
@UseGuards(JwtGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  admin(@Query('days') days?: string) {
    return this.statsService.admin(days ? Number(days) : 30);
  }

  @Get('doctor')
  @Roles(UserRole.DOCTOR)
  doctor(@Req() req: any, @Query('days') days?: string) {
    return this.statsService.doctor(req.user.id, days ? Number(days) : 30);
  }

  @Get('chw')
  @Roles(UserRole.CHW)
  chw(@Req() req: any, @Query('days') days?: string) {
    return this.statsService.chw(req.user.id, days ? Number(days) : 30);
  }

  @Get('pharmacist')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  pharmacist(@Query('days') days?: string) {
    return this.statsService.pharmacist(days ? Number(days) : 30);
  }

  @Get('patient')
  @Roles(UserRole.PATIENT)
  patient(@Req() req: any) {
    return this.statsService.patient(req.user.id);
  }
}
