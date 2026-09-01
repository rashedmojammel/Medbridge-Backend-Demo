import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patients } from '../patients/patients.entity';
import { DiaryEntries } from './diary-entries.entity';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiaryEntries, Patients])],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
