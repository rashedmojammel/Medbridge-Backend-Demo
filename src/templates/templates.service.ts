import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PrescriptionTemplates } from './prescription-templates.entity';
import { TemplateItems } from './template-items.entity';
import { CreateTemplateDto } from './dtos/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(PrescriptionTemplates)
    private templatesRepo: Repository<PrescriptionTemplates>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateTemplateDto, doctorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const template = await manager.save(
        manager.create(PrescriptionTemplates, {
          doctor: { id: doctorId } as any,
          name: dto.name,
          condition: dto.condition,
          notes: dto.notes,
          isShared: dto.isShared ?? false,
        }),
      );

      const items = dto.items.map((i) =>
        manager.create(TemplateItems, {
          template,
          medicine: { id: i.medicineId } as any,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          route: i.route ?? 'ORAL',
          instructions: i.instructions,
        }),
      );
      await manager.save(items);
      return template;
    });
  }

  /** Own templates plus anything another doctor chose to share. */
  async findAllFor(doctorId: number) {
    return this.templatesRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'items')
      .leftJoinAndSelect('items.medicine', 'medicine')
      .leftJoinAndSelect('t.doctor', 'doctor')
      .where('doctor.id = :doctorId OR t.isShared = true', { doctorId })
      .orderBy('t.useCount', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number, doctorId: number) {
    const template = await this.templatesRepo.findOne({
      where: { id },
      relations: { doctor: true, items: { medicine: true } },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.doctor?.id !== doctorId && !template.isShared)
      throw new ForbiddenException('That template belongs to another doctor');
    return template;
  }

  /**
   * Returns the template shaped as a prescription payload, ready to prefill
   * the form. Also bumps useCount so popular templates sort to the top.
   */
  async apply(id: number, doctorId: number) {
    const template = await this.findOne(id, doctorId);
    await this.templatesRepo.increment({ id }, 'useCount', 1);

    return {
      templateId: template.id,
      name: template.name,
      notes: template.notes,
      items: (template.items ?? []).map((i) => ({
        medicineId: i.medicine?.id,
        medicine: i.medicine,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        route: i.route,
        instructions: i.instructions,
      })),
    };
  }

  async remove(id: number, doctorId: number) {
    const template = await this.templatesRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.doctor?.id !== doctorId)
      throw new ForbiddenException('You can only delete your own templates');
    await this.templatesRepo.remove(template);
    return { deleted: true };
  }
}
