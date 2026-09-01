import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patients } from './patients.entity';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patients])],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService, TypeOrmModule],
})
export class PatientsModule {}
