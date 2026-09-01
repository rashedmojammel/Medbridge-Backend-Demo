import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SystemSettings } from './system-settings.entity';

/** Global so the triage service can read thresholds without an import chain. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
