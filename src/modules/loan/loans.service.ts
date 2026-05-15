import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
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

  async create(dto: CreateLoanDto) {
    const loanedAt = new Date(); // Asignado por el servidor
    const due = new Date(dto.dueAt);
    
    // Reglas de negocio (Sección 4.4)
    const maxDays = this.configService.get<number>('MAX_LOAN_DAYS', 30);
    const maxActiveLoans = this.configService.get<number>('MAX_ACTIVE_LOANS', 3);

    if (due <= loanedAt) {
      throw new ConflictException('La fecha de devolución debe ser futura'); // 409
    }
    
    const daysDiff = (due.getTime() - loanedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      throw new ConflictException(`El préstamo no puede exceder los ${maxDays} días`); // 409
    }

    // Un item solo puede estar prestado a uno a la vez
    const activeLoan = await this.loansRepo.findOne({ 
      where: { itemId: dto.itemId, status: LoanStatus.ACTIVE } 
    });
    if (activeLoan) throw new ConflictException('El item ya está prestado'); // 409

    // Límite de préstamos activos por usuario
    const userLoansCount = await this.loansRepo.count({ 
      where: { userId: dto.userId, status: LoanStatus.ACTIVE } 
    });
    if (userLoansCount >= maxActiveLoans) {
      throw new ConflictException('El usuario alcanzó el límite de préstamos activos'); // 409
    }

    const loan = this.loansRepo.create({
      ...dto,
      loanedAt,
      status: LoanStatus.ACTIVE,
    });
    return this.loansRepo.save(loan);
  }

  async findAll(query: FindLoansDto) {
    const qb = this.loansRepo.createQueryBuilder('loan');
    
    if (query.userId) qb.andWhere('loan.userId = :userId', { userId: query.userId });
    if (query.itemId) qb.andWhere('loan.itemId = :itemId', { itemId: query.itemId });
    if (query.status) qb.andWhere('loan.status = :status', { status: query.status });

    // Incluimos las relaciones para que el JSON sea más completo
    qb.leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.item', 'item')
      .orderBy('loan.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string) {
    const loan = await this.loansRepo.findOne({ 
      where: { id },
      relations: ['user', 'item']
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado'); // 404
    return loan;
  }

  async returnLoan(id: string) {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new ConflictException('El préstamo ya no está activo'); // 409
    }

    const returnedAt = new Date();
    let fineAmount = 0;

    // Cálculo de multa (server-side)
    if (returnedAt > loan.dueAt) {
      const daysLate = Math.ceil((returnedAt.getTime() - loan.dueAt.getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = this.configService.get<number>('DAILY_FINE_RATE', 0.50);
      fineAmount = daysLate * dailyRate;
    }

    loan.returnedAt = returnedAt;
    loan.status = LoanStatus.RETURNED;
    loan.fineAmount = fineAmount;

    return this.loansRepo.save(loan);
  }

  async markLost(id: string) {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new ConflictException('El préstamo no está activo o ya fue devuelto'); // 409
    }
    loan.status = LoanStatus.LOST;
    return this.loansRepo.save(loan);
  }
}