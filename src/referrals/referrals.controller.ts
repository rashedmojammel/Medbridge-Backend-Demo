import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ReferralStatus, UserRole } from '../auth/user-role.enum';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dtos/create-referral.dto';
import { UpdateReferralDto } from './dtos/update-referral.dto';

@ApiTags('Referrals')
@ApiBearerAuth('access-token')
@Controller('referrals')
@UseGuards(JwtGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /** A doctor or CHW decides remote care is not enough. */
  @Post()
  @Roles(UserRole.DOCTOR, UserRole.CHW)
  create(@Body() dto: CreateReferralDto, @Req() req: any) {
    return this.referralsService.create(dto, req.user);
  }

  @Get()
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.ADMIN)
  findAll(@Req() req: any, @Query('status') status?: ReferralStatus) {
    return this.referralsService.findAllFor(req.user, status);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.ADMIN)
  findForPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.referralsService.findForPatient(patientId);
  }

  /** Acknowledge, complete, or cancel - and record the outcome. */
  @Patch(':id')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReferralDto,
    @Req() req: any,
  ) {
    return this.referralsService.update(id, dto, req.user);
  }
}
