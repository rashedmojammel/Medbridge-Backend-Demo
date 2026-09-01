import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto, TimeOffDto } from './dtos/set-availability.dto';

@ApiTags('Availability')
@ApiBearerAuth('access-token')
@Controller('availability')
@UseGuards(JwtGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /** The signed-in doctor's own weekly pattern. */
  @Get('me')
  @Roles(UserRole.DOCTOR)
  mine(@Req() req: any) {
    return this.availabilityService.getAvailability(req.user.id);
  }

  @Put('me')
  @Roles(UserRole.DOCTOR)
  setMine(@Body() dto: SetAvailabilityDto, @Req() req: any) {
    return this.availabilityService.setAvailability(req.user.id, dto);
  }

  @Post('me/time-off')
  @Roles(UserRole.DOCTOR)
  addTimeOff(@Body() dto: TimeOffDto, @Req() req: any) {
    return this.availabilityService.addTimeOff(req.user.id, dto);
  }

  @Delete('me/time-off/:id')
  @Roles(UserRole.DOCTOR)
  removeTimeOff(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.availabilityService.removeTimeOff(req.user.id, id);
  }

  /** What a CHW sees when booking: real free slots for a specific date. */
  @Get('doctor/:doctorId/slots')
  @Roles(UserRole.CHW, UserRole.DOCTOR, UserRole.ADMIN)
  freeSlots(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ) {
    return this.availabilityService.freeSlots(doctorId, date);
  }

  @Get('doctor/:doctorId')
  @Roles(UserRole.CHW, UserRole.DOCTOR, UserRole.ADMIN)
  forDoctor(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.availabilityService.getAvailability(doctorId);
  }
}
