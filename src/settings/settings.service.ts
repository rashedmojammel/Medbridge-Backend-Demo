import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettings } from './system-settings.entity';
import { UpdateSettingsDto } from './dtos/update-setting.dto';

/** Clinical and operational defaults, seeded on first boot. */
export const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  description: string;
  category: string;
}> = [
  // triage thresholds - these drive the CRITICAL rule engine
  { key: 'triage.spo2.critical', value: '92', description: 'SpO2 below this is critical (%)', category: 'triage' },
  { key: 'triage.spo2.warning', value: '95', description: 'SpO2 below this is a warning (%)', category: 'triage' },
  { key: 'triage.systolic.high', value: '160', description: 'Systolic above this is critical (mmHg)', category: 'triage' },
  { key: 'triage.systolic.low', value: '90', description: 'Systolic below this is critical (mmHg)', category: 'triage' },
  { key: 'triage.temperature.critical', value: '39.5', description: 'Temperature above this is critical (C)', category: 'triage' },
  { key: 'triage.temperature.warning', value: '37.5', description: 'Temperature above this is a warning (C)', category: 'triage' },
  { key: 'triage.pulse.critical', value: '120', description: 'Pulse above this is critical (bpm)', category: 'triage' },
  { key: 'triage.pulse.warning', value: '100', description: 'Pulse above this is a warning (bpm)', category: 'triage' },

  // inventory
  { key: 'inventory.defaultThreshold', value: '20', description: 'Default low-stock threshold for new medicines', category: 'inventory' },

  // scheduling
  { key: 'scheduling.defaultSlotMinutes', value: '30', description: 'Default consultation slot length', category: 'scheduling' },
  { key: 'scheduling.reminderHours', value: '24', description: 'Hours before an appointment to send a reminder', category: 'scheduling' },

  // platform
  { key: 'platform.name', value: 'Medbridge', description: 'Display name', category: 'platform' },
  { key: 'platform.announcement', value: '', description: 'Banner shown to all users when non-empty', category: 'platform' },
  { key: 'platform.supportEmail', value: 'support@medbridge.com.bd', description: 'Support contact', category: 'platform' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(SystemSettings) private settingsRepo: Repository<SystemSettings>,
  ) {}

  /** Seeds any missing defaults on boot, then warms the cache. */
  async onModuleInit() {
    try {
      for (const def of DEFAULT_SETTINGS) {
        const existing = await this.settingsRepo.findOne({ where: { key: def.key } });
        if (!existing) await this.settingsRepo.save(this.settingsRepo.create(def));
      }
      await this.refreshCache();
    } catch {
      // table may not exist yet on a very first run - the cache falls back
      // to DEFAULT_SETTINGS, so the app still boots
    }
  }

  private async refreshCache() {
    const all = await this.settingsRepo.find();
    this.cache.clear();
    all.forEach((s) => this.cache.set(s.key, s.value));
  }

  /** Synchronous read used by the triage rule engine on every request. */
  getNumber(key: string, fallback: number): number {
    const raw = this.cache.get(key);
    if (raw === undefined || raw === '') {
      const def = DEFAULT_SETTINGS.find((d) => d.key === key);
      return def ? Number(def.value) : fallback;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  getString(key: string, fallback = ''): string {
    return this.cache.get(key) ?? fallback;
  }

  async findAll(category?: string) {
    const where = category ? { category } : {};
    return this.settingsRepo.find({ where, order: { category: 'ASC', key: 'ASC' } });
  }

  async update(dto: UpdateSettingsDto) {
    for (const item of dto.settings) {
      const existing = await this.settingsRepo.findOne({ where: { key: item.key } });
      if (existing) {
        existing.value = item.value;
        await this.settingsRepo.save(existing);
      } else {
        await this.settingsRepo.save(
          this.settingsRepo.create({ key: item.key, value: item.value }),
        );
      }
    }
    await this.refreshCache();
    return this.findAll();
  }

  /** Convenience bundle for the triage service. */
  triageThresholds() {
    return {
      spo2Critical: this.getNumber('triage.spo2.critical', 92),
      spo2Warning: this.getNumber('triage.spo2.warning', 95),
      systolicHigh: this.getNumber('triage.systolic.high', 160),
      systolicLow: this.getNumber('triage.systolic.low', 90),
      temperatureCritical: this.getNumber('triage.temperature.critical', 39.5),
      temperatureWarning: this.getNumber('triage.temperature.warning', 37.5),
      pulseCritical: this.getNumber('triage.pulse.critical', 120),
      pulseWarning: this.getNumber('triage.pulse.warning', 100),
    };
  }
}
