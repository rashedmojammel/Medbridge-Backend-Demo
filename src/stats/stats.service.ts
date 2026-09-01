import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConsultationStatus,
  DispenseStatus,
  PrescriptionStatus,
  TriageStatus,
  UserRole,
} from '../auth/user-role.enum';
import { Consultations } from '../consultations/consultations.entity';
import { MedicineInventory } from '../medicines/medicine-inventory.entity';
import { Medicines } from '../medicines/medicines.entity';
import { Patients } from '../patients/patients.entity';
import { Prescriptions } from '../prescriptions/prescriptions.entity';
import { SymptomReports } from '../triage/symptom-reports.entity';
import { Users } from '../users/users.entity';

/**
 * Aggregate counts computed in SQL. Every dashboard previously fetched full
 * lists and counted them in the browser, which is fine at demo scale and
 * wrong at real scale - these replace that.
 */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    @InjectRepository(Consultations) private consultRepo: Repository<Consultations>,
    @InjectRepository(Prescriptions) private rxRepo: Repository<Prescriptions>,
    @InjectRepository(Medicines) private medsRepo: Repository<Medicines>,
    @InjectRepository(MedicineInventory) private invRepo: Repository<MedicineInventory>,
    @InjectRepository(SymptomReports) private reportsRepo: Repository<SymptomReports>,
  ) {}

  private since(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async admin(days = 30) {
    const from = this.since(days);

    const [
      totalUsers,
      doctors,
      chws,
      pharmacists,
      totalPatients,
      newPatients,
      totalConsults,
      periodConsults,
      totalRx,
      periodRx,
      totalMedicines,
      lowStock,
      criticalReports,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { role: UserRole.DOCTOR } }),
      this.usersRepo.count({ where: { role: UserRole.CHW } }),
      this.usersRepo.count({ where: { role: UserRole.PHARMACIST } }),
      this.patientsRepo.count(),
      this.patientsRepo
        .createQueryBuilder('p')
        .where('p.createdAt >= :from', { from })
        .getCount(),
      this.consultRepo.count(),
      this.consultRepo
        .createQueryBuilder('c')
        .where('c.scheduledAt >= :from', { from })
        .getCount(),
      this.rxRepo.count(),
      this.rxRepo
        .createQueryBuilder('r')
        .where('r.issuedAt >= :from', { from })
        .getCount(),
      this.medsRepo.count(),
      this.invRepo
        .createQueryBuilder('i')
        .where('i.stockQty < i.threshold')
        .getCount(),
      this.reportsRepo.count({ where: { triageStatus: TriageStatus.CRITICAL } }),
    ]);

    // patients per district, straight from SQL
    const byDistrict = await this.patientsRepo
      .createQueryBuilder('p')
      .select('COALESCE(NULLIF(p.district, \'\'), \'Unrecorded\')', 'district')
      .addSelect('COUNT(*)', 'count')
      .groupBy('district')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      periodDays: days,
      users: { total: totalUsers, doctors, chws, pharmacists },
      patients: { total: totalPatients, newInPeriod: newPatients },
      consultations: { total: totalConsults, inPeriod: periodConsults },
      prescriptions: { total: totalRx, inPeriod: periodRx },
      medicines: { total: totalMedicines, lowStock },
      criticalReports,
      byDistrict: byDistrict.map((r) => ({
        district: r.district,
        count: Number(r.count),
      })),
    };
  }

  async doctor(doctorId: number, days = 30) {
    const from = this.since(days);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [todayConsults, totalConsults, completed, pendingDiagnosis, totalRx, periodRx] =
      await Promise.all([
        this.consultRepo
          .createQueryBuilder('c')
          .where('c.doctorId = :doctorId', { doctorId })
          .andWhere('c.scheduledAt >= :s AND c.scheduledAt < :e', {
            s: todayStart,
            e: todayEnd,
          })
          .getCount(),
        this.consultRepo
          .createQueryBuilder('c')
          .where('c.doctorId = :doctorId', { doctorId })
          .getCount(),
        this.consultRepo
          .createQueryBuilder('c')
          .where('c.doctorId = :doctorId', { doctorId })
          .andWhere('c.status = :status', { status: ConsultationStatus.COMPLETED })
          .getCount(),
        this.consultRepo
          .createQueryBuilder('c')
          .where('c.doctorId = :doctorId', { doctorId })
          .andWhere('c.status = :status', { status: ConsultationStatus.COMPLETED })
          .andWhere("(c.diagnosis IS NULL OR c.diagnosis = '')")
          .getCount(),
        this.rxRepo
          .createQueryBuilder('r')
          .where('r.doctorId = :doctorId', { doctorId })
          .getCount(),
        this.rxRepo
          .createQueryBuilder('r')
          .where('r.doctorId = :doctorId', { doctorId })
          .andWhere('r.issuedAt >= :from', { from })
          .getCount(),
      ]);

    const uniquePatients = await this.consultRepo
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.patientId)', 'count')
      .where('c.doctorId = :doctorId', { doctorId })
      .getRawOne();

    return {
      periodDays: days,
      consultations: {
        today: todayConsults,
        total: totalConsults,
        completed,
        pendingDiagnosis,
      },
      prescriptions: { total: totalRx, inPeriod: periodRx },
      uniquePatients: Number(uniquePatients?.count ?? 0),
    };
  }

  async chw(chwId: number, days = 30) {
    const from = this.since(days);

    const [totalPatients, newPatients, scheduled] = await Promise.all([
      this.patientsRepo
        .createQueryBuilder('p')
        .where('p.registeredById = :chwId', { chwId })
        .getCount(),
      this.patientsRepo
        .createQueryBuilder('p')
        .where('p.registeredById = :chwId', { chwId })
        .andWhere('p.createdAt >= :from', { from })
        .getCount(),
      this.consultRepo
        .createQueryBuilder('c')
        .where('c.scheduledById = :chwId', { chwId })
        .andWhere('c.status = :status', { status: ConsultationStatus.SCHEDULED })
        .getCount(),
    ]);

    // critical patients this CHW registered who have no open consultation.
    // This is the follow-up gap the dashboard previously approximated with
    // one request per patient in the browser.
    const followUps = await this.reportsRepo
      .createQueryBuilder('sr')
      .innerJoin('sr.patient', 'p')
      .where('sr.triageStatus = :critical', { critical: TriageStatus.CRITICAL })
      .andWhere('p.registeredById = :chwId', { chwId })
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM consultations c
           WHERE c."patientId" = p.id
             AND c.status NOT IN (:...closed)
         )`,
        { closed: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] },
      )
      .getCount();

    return {
      periodDays: days,
      patients: { total: totalPatients, newInPeriod: newPatients },
      consultationsScheduled: scheduled,
      criticalAwaitingConsultation: followUps,
    };
  }

  async pharmacist(days = 30) {
    const from = this.since(days);

    const [totalMedicines, lowStock, outOfStock, pendingDispense, dispensedInPeriod] =
      await Promise.all([
        this.medsRepo.count(),
        this.invRepo.createQueryBuilder('i').where('i.stockQty < i.threshold').getCount(),
        this.invRepo.createQueryBuilder('i').where('i.stockQty = 0').getCount(),
        this.rxRepo
          .createQueryBuilder('r')
          .where('r.status = :active', { active: PrescriptionStatus.ACTIVE })
          .andWhere('r.dispenseStatus != :done', { done: DispenseStatus.DISPENSED })
          .getCount(),
        this.rxRepo
          .createQueryBuilder('r')
          .where('r.dispensedAt >= :from', { from })
          .getCount(),
      ]);

    // Medicines carries no price column, so a currency stock value is not
    // something we can compute. Report the units actually on the shelf.
    const { units } = await this.invRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.stockQty), 0)', 'units')
      .getRawOne<{ units: string }>();

    return {
      periodDays: days,
      medicines: { total: totalMedicines, lowStock, outOfStock },
      dispensing: { pending: pendingDispense, completedInPeriod: dispensedInPeriod },
      unitsInStock: Number(units ?? 0),
    };
  }

  async patient(userId: number) {
    const patient = await this.patientsRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!patient) return null;

    const [consultations, prescriptions, activeRx] = await Promise.all([
      this.consultRepo
        .createQueryBuilder('c')
        .where('c.patientId = :pid', { pid: patient.id })
        .getCount(),
      this.rxRepo
        .createQueryBuilder('r')
        .where('r.patientId = :pid', { pid: patient.id })
        .getCount(),
      this.rxRepo
        .createQueryBuilder('r')
        .where('r.patientId = :pid', { pid: patient.id })
        .andWhere('r.status = :status', { status: PrescriptionStatus.ACTIVE })
        .getCount(),
    ]);

    return {
      mrn: patient.mrn,
      consultations,
      prescriptions: { total: prescriptions, active: activeRx },
    };
  }
}
