import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { MedicineAlternatives } from './medicine-alternatives.entity';
import { MedicineInventory } from './medicine-inventory.entity';
import { Medicines } from './medicines.entity';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Medicines, MedicineInventory, MedicineAlternatives]),
    NotificationsModule,
  ],
  controllers: [MedicinesController],
  providers: [MedicinesService],
  exports: [MedicinesService, TypeOrmModule],
})
export class MedicinesModule {}
