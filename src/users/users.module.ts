import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctors } from './doctors.entity';
import { HealthWorkers } from './health-workers.entity';
import { Staff } from './staff.entity';
import { Users } from './users.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Doctors, HealthWorkers, Staff])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
