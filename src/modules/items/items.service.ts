import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { Loan, LoanStatus } from '../loan/entities/loan.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FindItemsDto } from './dto/find-items.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    @InjectRepository(Loan)
    private readonly loansRepo: Repository<Loan>,
  ) {}

  async create(dto: CreateItemDto) {
    const existing = await this.itemsRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('El código del item ya existe'); // Error 409
    }
    const item = this.itemsRepo.create(dto);
    return this.itemsRepo.save(item);
  }

  async findAll(query: FindItemsDto) {
    const qb = this.itemsRepo.createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true }); // Solo activos

    if (query.type) {
      qb.andWhere('item.type = :type', { type: query.type });
    }

    const items = await qb.getMany();
    
    // Calculamos isAvailable para cada item
    return Promise.all(items.map(async (item) => {
      const activeLoan = await this.loansRepo.findOne({
        where: { itemId: item.id, status: LoanStatus.ACTIVE }
      });
      return { ...item, isAvailable: !activeLoan }; // Calculado: no tiene préstamo activo
    }));
  }

  async findOne(id: string) {
    const item = await this.itemsRepo.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException('Item no encontrado'); // Error 404
    }
    const activeLoan = await this.loansRepo.findOne({
      where: { itemId: item.id, status: LoanStatus.ACTIVE }
    });
    return { ...item, isAvailable: !activeLoan };
  }

  async update(id: string, dto: UpdateItemDto) {
    const item = await this.itemsRepo.findOne({ where: { id, isActive: true } });
    if (!item) throw new NotFoundException('Item no encontrado');

    Object.assign(item, dto);
    return this.itemsRepo.save(item);
  }

  async remove(id: string) {
    const item = await this.itemsRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');

    item.isActive = false; // Soft delete
    await this.itemsRepo.save(item);
  }
}