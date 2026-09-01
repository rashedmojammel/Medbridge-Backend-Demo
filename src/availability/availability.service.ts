import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConsultationStatus } from '../auth/user-role.enum';
import { Consultations } from '../consultations/consultations.entity';
import { DoctorAvailability } from './doctor-availability.entity';
import { TimeOff } from './time-off.entity';
import { SetAvailabilityDto, TimeOffDto } from './dtos/set-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(DoctorAvailability)
    private availRepo: Repository<DoctorAvailability>,
    @InjectRepository(TimeOff) private timeOffRepo: Repository<TimeOff>,
    @InjectRepository(Consultations) private consultRepo: Repository<Consultations>,
    private dataSource: DataSource,
  ) {}

  /** Replaces the doctor's whole weekly pattern in one transaction. */
  async setAvailability(doctorId: number, dto: SetAvailabilityDto) {
    for (const s of dto.slots) {
      if (s.endTime <= s.startTime)
        throw new BadRequestException(
          `endTime must be after startTime (day ${s.dayOfWeek})`,
        );
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(DoctorAvailability, { doctor: { id: doctorId } });

      const rows = dto.slots.map((s) =>
        manager.create(DoctorAvailability, {
          doctor: { id: doctorId } as any,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotMinutes: s.slotMinutes ?? 30,
          isActive: s.isActive ?? true,
        }),
      );
      return manager.save(rows);
    });
  }

  async getAvailability(doctorId: number) {
    const slots = await this.availRepo.find({
      where: { doctor: { id: doctorId } },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    const timeOff = await this.timeOffRepo.find({
      where: { doctor: { id: doctorId } },
      order: { date: 'ASC' },
    });
    return { slots, timeOff };
  }

  async addTimeOff(doctorId: number, dto: TimeOffDto) {
    return this.timeOffRepo.save(
      this.timeOffRepo.create({
        doctor: { id: doctorId } as any,
        date: dto.date,
        reason: dto.reason,
      }),
    );
  }

  async removeTimeOff(doctorId: number, id: number) {
    const row = await this.timeOffRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });
    if (!row) throw new NotFoundException('Time off entry not found');
    if (row.doctor?.id !== doctorId)
      throw new BadRequestException('That entry belongs to another doctor');
    await this.timeOffRepo.remove(row);
    return { deleted: true };
  }

  /**
   * The slots a CHW can actually book on a given date: the weekly pattern
   * for that weekday, expanded into intervals, minus anything already booked
   * and minus the whole day if the doctor is off.
   */
  async freeSlots(doctorId: number, dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('date must be YYYY-MM-DD');

    const off = await this.timeOffRepo.findOne({
      where: { doctor: { id: doctorId }, date: dateStr },
    });
    if (off) return { date: dateStr, slots: [], reason: off.reason ?? 'Unavailable' };

    const patterns = await this.availRepo.find({
      where: { doctor: { id: doctorId }, dayOfWeek: date.getDay(), isActive: true },
      order: { startTime: 'ASC' },
    });
    if (patterns.length === 0)
      return { date: dateStr, slots: [], reason: 'No consulting hours set' };

    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await this.consultRepo
      .createQueryBuilder('c')
      .where('c.doctorId = :doctorId', { doctorId })
      .andWhere('c.scheduledAt >= :dayStart AND c.scheduledAt < :dayEnd', {
        dayStart,
        dayEnd,
      })
      .andWhere('c.status != :cancelled', { cancelled: ConsultationStatus.CANCELLED })
      .getMany();

    const takenTimes = new Set(
      booked.map((c) => new Date(c.scheduledAt).toTimeString().slice(0, 5)),
    );

    const slots: string[] = [];
    for (const p of patterns) {
      let cursor = this.toMinutes(p.startTime);
      const end = this.toMinutes(p.endTime);
      while (cursor + p.slotMinutes <= end) {
        const label = this.toLabel(cursor);
        if (!takenTimes.has(label)) slots.push(label);
        cursor += p.slotMinutes;
      }
    }

    return { date: dateStr, slots };
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  }

  private toLabel(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
