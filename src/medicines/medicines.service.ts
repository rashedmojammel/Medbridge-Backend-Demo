import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationType, StockAction, UserRole } from '../auth/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { MedicineAlternatives } from './medicine-alternatives.entity';
import { MedicineInventory } from './medicine-inventory.entity';
import { Medicines } from './medicines.entity';
import { CreateMedicineDto } from './dtos/create-medicine.dto';
import { UpdateStockDto } from './dtos/update-stock.dto';

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicines) private medsRepo: Repository<Medicines>,
    @InjectRepository(MedicineInventory) private invRepo: Repository<MedicineInventory>,
    @InjectRepository(MedicineAlternatives) private altRepo: Repository<MedicineAlternatives>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  /** FR-7.1 case-insensitive search on brand OR generic name */
  async search(q: string) {
    if (!q) return [];
    return this.medsRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.inventory', 'i')
      .where('m.brandName ILIKE :q OR m.genericName ILIKE :q', { q: `%${q}%` })
      .getMany();
  }

  /** FR-7.5 */
  async getAlternatives(medicineId: number) {
    const pairs = await this.altRepo.find({ where: { medicine: { id: medicineId } } });
    return pairs.map((p) => p.alternative);
  }

  /** FR-7.2 catalog create + initial inventory + symmetric alternatives, one transaction */
  async create(dto: CreateMedicineDto) {
    return this.dataSource.transaction(async (manager) => {
      const medicine = await manager.save(
        manager.create(Medicines, {
          brandName: dto.brandName,
          genericName: dto.genericName,
          manufacturer: dto.manufacturer,
          dosageForm: dto.dosageForm,
          strength: dto.strength,
          therapeuticClass: dto.therapeuticClass,
          isAvailable: dto.isAvailable ?? true,
        }),
      );

      await manager.save(
        manager.create(MedicineInventory, {
          medicine,
          stockQty: dto.stockQty ?? 0,
          threshold: dto.threshold ?? 10,
        }),
      );

      if (dto.alternativeIds?.length) {
        for (const altId of dto.alternativeIds) {
          await manager.save(manager.create(MedicineAlternatives, { medicine, alternative: { id: altId } as any }));
          await manager.save(manager.create(MedicineAlternatives, { medicine: { id: altId } as any, alternative: medicine }));
        }
      }
      return medicine;
    });
  }

  async update(id: number, dto: Partial<CreateMedicineDto>) {
    const medicine = await this.medsRepo.findOne({ where: { id } });
    if (!medicine) throw new NotFoundException('Medicine not found');
    Object.assign(medicine, {
      brandName: dto.brandName ?? medicine.brandName,
      genericName: dto.genericName ?? medicine.genericName,
      manufacturer: dto.manufacturer ?? medicine.manufacturer,
      dosageForm: dto.dosageForm ?? medicine.dosageForm,
      strength: dto.strength ?? medicine.strength,
      therapeuticClass: dto.therapeuticClass ?? medicine.therapeuticClass,
      isAvailable: dto.isAvailable ?? medicine.isAvailable,
    });
    return this.medsRepo.save(medicine);
  }

  /** FR-7.3 + FR-7.4: never below 0; threshold crossing notifies in the SAME transaction */
  async updateStock(medicineId: number, dto: UpdateStockDto, pharmacistId: number) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(MedicineInventory, {
        where: { medicine: { id: medicineId } },
        relations: { medicine: true },
      });
      if (!inv) throw new NotFoundException('Inventory record not found');

      const before = inv.stockQty;
      let after: number;
      if (dto.action === StockAction.ADD) after = before + dto.quantity;
      else if (dto.action === StockAction.REDUCE) after = before - dto.quantity;
      else after = dto.quantity; // SET

      if (after < 0) throw new BadRequestException('Stock cannot go below 0');

      inv.stockQty = after;
      inv.updatedBy = { id: pharmacistId } as any;
      await manager.save(inv);

      const crossedBelow = before >= inv.threshold && after < inv.threshold;
      if (crossedBelow) {
        await this.notificationsService.createForRole(
          UserRole.PHARMACIST, NotificationType.LOW_STOCK,
          'Low stock alert',
          `${inv.medicine.brandName} is now below threshold (${after}/${inv.threshold})`,
          medicineId, manager,
        );
        await this.notificationsService.createForRole(
          UserRole.ADMIN, NotificationType.LOW_STOCK,
          'Low stock alert',
          `${inv.medicine.brandName} is now below threshold (${after}/${inv.threshold})`,
          medicineId, manager,
        );
      }
      return inv;
    });
  }

  /** FR-7.3 low-stock list. NOTE: declared BEFORE :id routes in the controller */
  async lowStock() {
    return this.invRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.medicine', 'm')
      .where('i.stockQty < i.threshold')
      .getMany();
  }
}
