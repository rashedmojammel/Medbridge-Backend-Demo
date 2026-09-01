import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dtos/create-visit.dto';

@ApiTags('Field visits')
@ApiBearerAuth('access-token')
@Controller('field-visits')
@UseGuards(JwtGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Roles(UserRole.CHW)
  create(@Body() dto: CreateVisitDto, @Req() req: any) {
    return this.visitsService.create(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.CHW, UserRole.ADMIN)
  findAll(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.visitsService.findAllFor(req.user, {
      from,
      to,
      patientId: patientId ? Number(patientId) : undefined,
    });
  }

  /** Coverage stats: visits, unique patients, outcomes, villages, travel time. */
  @Get('stats')
  @Roles(UserRole.CHW)
  stats(@Req() req: any, @Query('days') days?: string) {
    return this.visitsService.stats(req.user.id, days ? Number(days) : 30);
  }

  @Delete(':id')
  @Roles(UserRole.CHW, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.visitsService.remove(id, req.user);
  }
}
