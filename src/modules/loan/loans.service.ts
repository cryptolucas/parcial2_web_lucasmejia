import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepo: Repository<Loan>,
    private readonly configService: ConfigService,
  ) {}

  // =========================================================================
  // HELPER: Actualiza los préstamos vencidos automáticamente (Regla R5)
  // =========================================================================
  private async updateOverdueLoansAutomatically() {
    await this.loansRepo
      .createQueryBuilder()
      .update(Loan)
      .set({ status: LoanStatus.OVERDUE })
      .where("status = :activeStatus AND dueAt < :now", { 
        activeStatus: LoanStatus.ACTIVE, 
        now: new Date() 
      })
      .execute();
  }

  // =========================================================================
  // CREAR PRÉSTAMO
  // =========================================================================
  async create(dto: CreateLoanDto) {
    // Primero, asegurarnos de que no haya vencidos flotando en la BD
    await this.updateOverdueLoansAutomatically();

    const loanedAt = new Date();
    const dueAt = new Date(dto.dueAt);

    // ---------------------------------------------------------
    // Regla R1 — Validación de fechas (HTTP 400)
    // ---------------------------------------------------------
    if (dueAt <= loanedAt) {
      throw new BadRequestException('dueAt debe ser mayor a loanedAt (ahora)');
    }

    const diffDaysR1 = (dueAt.getTime() - loanedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDaysR1 > 30) {
      throw new BadRequestException('La ventana máxima de préstamo es de 30 días');
    }

    // ---------------------------------------------------------
    // Regla R2 — Item disponible (HTTP 409)
    // ---------------------------------------------------------
    const blockingLoan = await this.loansRepo.findOne({ 
      where: { 
        itemId: dto.itemId, 
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]) 
      } 
    });
    
    if (blockingLoan) {
      throw new ConflictException(`El item ya está prestado. Bloqueado por el préstamo ID: ${blockingLoan.id}`);
    }

    // ---------------------------------------------------------
    // Regla R3 — Límite de préstamos simultáneos por usuario (HTTP 409)
    // ---------------------------------------------------------
    const maxActiveLoans = this.configService.get<number>('MAX_ACTIVE_LOANS', 3);
    const userLoansCount = await this.loansRepo.count({ 
      where: { 
        userId: dto.userId, 
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]) 
      } 
    });

    if (userLoansCount >= maxActiveLoans) {
      throw new ConflictException('El usuario alcanzó el límite máximo de préstamos simultáneos');
    }

    // Si pasa todas las validaciones, creamos
    const loan = this.loansRepo.create({
      ...dto,
      loanedAt,
      status: LoanStatus.ACTIVE,
    });
    return this.loansRepo.save(loan);
  }

  // =========================================================================
  // LISTAR PRÉSTAMOS
  // =========================================================================
  async findAll(query: FindLoansDto) {
    // Actualizamos automáticamente los overdue antes de consultar (Regla 5)
    await this.updateOverdueLoansAutomatically();

    const qb = this.loansRepo.createQueryBuilder('loan');
    
    if (query.userId) qb.andWhere('loan.userId = :userId', { userId: query.userId });
    if (query.itemId) qb.andWhere('loan.itemId = :itemId', { itemId: query.itemId });
    if (query.status) qb.andWhere('loan.status = :status', { status: query.status });

    qb.leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.item', 'item')
      .orderBy('loan.createdAt', 'DESC');

    return qb.getMany();
  }

  // =========================================================================
  // DETALLE DE PRÉSTAMO
  // =========================================================================
  async findOne(id: string) {
    await this.updateOverdueLoansAutomatically();

    const loan = await this.loansRepo.findOne({ 
      where: { id },
      relations: ['user', 'item']
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    return loan;
  }

  // =========================================================================
  // DEVOLVER PRÉSTAMO (Regla R4 y R5)
  // =========================================================================
  async returnLoan(id: string) {
    const loan = await this.findOne(id);

    // Regla R5: returned y lost son terminales (HTTP 400)
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException('El préstamo ya se encuentra en un estado terminal (returned o lost)');
    }

    // Regla R4: Cálculo de multa
    const returnedAt = new Date();
    const dailyRate = this.configService.get<number>('DAILY_FINE_RATE', 0.50);
    
    // Cálculo de días atrasados con Math.ceil según la fórmula
    const diffMs = returnedAt.getTime() - loan.dueAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const daysOverdue = Math.max(0, Math.ceil(diffDays));

    const fineAmount = daysOverdue * dailyRate;

    // Actualizamos
    loan.returnedAt = returnedAt;
    loan.status = LoanStatus.RETURNED;
    loan.fineAmount = fineAmount;

    return this.loansRepo.save(loan);
  }

  // =========================================================================
  // MARCAR COMO PERDIDO (Regla R5)
  // =========================================================================
  async markLost(id: string) {
    const loan = await this.findOne(id);

    // Regla R5: returned y lost son terminales (HTTP 400)
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException('El préstamo ya se encuentra en un estado terminal (returned o lost)');
    }

    loan.status = LoanStatus.LOST;
    return this.loansRepo.save(loan);
  }
}