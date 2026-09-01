import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAction,
  DispenseStatus,
  NotificationType,
  PrescriptionStatus,
  UserRole,
} from '../auth/user-role.enum';
import { AuditService } from '../audit/audit.service';
import { MedicineInventory } from '../medicines/medicine-inventory.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DispenseRecords } from './dispense-records.entity';
import { Prescriptions } from './prescriptions.entity';
import { DispenseDto } from './dtos/dispense.dto';

@Injectable()
export class DispensingService {
  constructor(
    @InjectRepository(Prescriptions) private rxRepo: Repository<Prescriptions>,
    @InjectRepository(DispenseRecords) private dispenseRepo: Repository<DispenseRecords>,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private dataSource: DataSource,
  ) {}

  /**
   * Closes the prescription loop: records what was handed over AND decrements
   * stock, in one transaction. Before this existed a prescription could be
   * issued and nothing in the system knew whether the patient ever received
   * the medicine, and stock never moved.
   *
   * Partial dispensing is supported - a pharmacy may only have two of three
   * medicines, so the prescription stays PARTIAL until everything is out.
   */
  async dispense(
    prescriptionId: number,
    dto: DispenseDto,
    pharmacist: { id: number; email?: string; role?: string },
  ) {
    const rx = await this.rxRepo.findOne({
      where: { id: prescriptionId },
      relations: { patient: { user: true }, items: { medicine: true } },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (rx.status === PrescriptionStatus.CANCELLED)
      throw new BadRequestException('Cannot dispense a cancelled prescription');
    if (rx.dispenseStatus === DispenseStatus.DISPENSED)
      throw new BadRequestException('This prescription has already been fully dispensed');

    // every medicine dispensed must actually appear on the prescription
    const prescribedIds = new Set((rx.items ?? []).map((i) => i.medicine?.id));
    for (const item of dto.items) {
      if (!prescribedIds.has(item.medicineId))
        throw new BadRequestException(
          `Medicine ${item.medicineId} is not on this prescription`,
        );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const lowStockHits: { name: string; after: number; threshold: number; id: number }[] = [];

      for (const item of dto.items) {
        const inv = await manager.findOne(MedicineInventory, {
          where: { medicine: { id: item.medicineId } },
          relations: { medicine: true },
        });
        if (!inv)
          throw new NotFoundException(
            `No inventory record for medicine ${item.medicineId}`,
          );

        const before = inv.stockQty;
        const after = before - item.quantity;
        if (after < 0)
          throw new BadRequestException(
            `Not enough stock for ${inv.medicine?.brandName}: ${before} available, ${item.quantity} requested`,
          );

        inv.stockQty = after;
        inv.updatedBy = { id: pharmacist.id } as any;
        await manager.save(inv);

        await manager.save(
          manager.create(DispenseRecords, {
            prescription: { id: rx.id } as any,
            medicine: { id: item.medicineId } as any,
            quantity: item.quantity,
            dispensedBy: { id: pharmacist.id } as any,
            notes: dto.notes,
          }),
        );

        // same threshold-crossing rule the manual stock update uses
        if (before >= inv.threshold && after < inv.threshold) {
          lowStockHits.push({
            name: inv.medicine?.brandName ?? 'Medicine',
            after,
            threshold: inv.threshold,
            id: item.medicineId,
          });
        }
      }

      // how much of the prescription is now out the door
      const allRecords = await manager.find(DispenseRecords, {
        where: { prescription: { id: rx.id } },
        relations: { medicine: true },
      });
      const dispensedMedicineIds = new Set(allRecords.map((r) => r.medicine?.id));
      const fullyDispensed = (rx.items ?? []).every((i) =>
        dispensedMedicineIds.has(i.medicine?.id),
      );

      rx.dispenseStatus = fullyDispensed
        ? DispenseStatus.DISPENSED
        : DispenseStatus.PARTIAL;
      if (fullyDispensed) rx.dispensedAt = new Date();
      await manager.save(rx);

      // low-stock alerts ride inside the same transaction, as elsewhere
      for (const hit of lowStockHits) {
        const body = `${hit.name} is now below threshold (${hit.after}/${hit.threshold})`;
        await this.notificationsService.createForRole(
          UserRole.PHARMACIST,
          NotificationType.LOW_STOCK,
          'Low stock alert',
          body,
          hit.id,
          manager,
        );
        await this.notificationsService.createForRole(
          UserRole.ADMIN,
          NotificationType.LOW_STOCK,
          'Low stock alert',
          body,
          hit.id,
          manager,
        );
      }

      return { fullyDispensed, lowStockHits };
    });

    // notify the patient outside the transaction - not critical to atomicity
    if (rx.patient?.user) {
      await this.notificationsService.create(
        rx.patient.user.id,
        NotificationType.PRESCRIPTION_READY,
        result.fullyDispensed ? 'Medicine dispensed' : 'Medicine partially dispensed',
        `Prescription #${rx.id} has been ${
          result.fullyDispensed ? 'fully' : 'partially'
        } dispensed by the pharmacy.`,
        rx.id,
      );
    }

    this.auditService.record({
      actor: pharmacist,
      action: AuditAction.DISPENSE,
      resource: 'prescriptions',
      resourceId: rx.id,
      detail: `Dispensed ${dto.items.length} item(s); status ${
        result.fullyDispensed ? 'DISPENSED' : 'PARTIAL'
      }`,
    });

    return this.findDispenseHistory(rx.id);
  }

  async findDispenseHistory(prescriptionId: number) {
    const rx = await this.rxRepo.findOne({
      where: { id: prescriptionId },
      relations: { items: { medicine: true }, patient: true, doctor: true },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    const records = await this.dispenseRepo.find({
      where: { prescription: { id: prescriptionId } },
      order: { dispensedAt: 'DESC' },
    });

    // what is still owed to the patient
    const dispensedIds = new Set(records.map((r) => r.medicine?.id));
    const outstanding = (rx.items ?? []).filter(
      (i) => !dispensedIds.has(i.medicine?.id),
    );

    return {
      prescriptionId: rx.id,
      dispenseStatus: rx.dispenseStatus,
      dispensedAt: rx.dispensedAt,
      records,
      outstanding,
    };
  }

  /** Queue for the pharmacy: active prescriptions not yet fully dispensed. */
  async pendingQueue() {
    return this.rxRepo.find({
      where: [
        { status: PrescriptionStatus.ACTIVE, dispenseStatus: DispenseStatus.PENDING },
        { status: PrescriptionStatus.ACTIVE, dispenseStatus: DispenseStatus.PARTIAL },
      ],
      relations: { patient: true, doctor: true, items: { medicine: true } },
      order: { issuedAt: 'ASC' },
      take: 100,
    });
  }
}
