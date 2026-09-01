import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultations } from '../consultations/consultations.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { DoctorAvailability } from './doctor-availability.entity';
import { TimeOff } from './time-off.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorAvailability, TimeOff, Consultations])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
