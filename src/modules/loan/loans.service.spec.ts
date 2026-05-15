import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { Loan, LoanStatus } from './entities/loan.entity';

describe('LoansService', () => {
  let service: LoansService;
  let repo: any;

  beforeEach(async () => {
    // Mock del QueryBuilder para la función automática updateOverdueLoansAutomatically
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(true),
    };

    // Mock del repositorio de TypeORM
    repo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((loan) => Promise.resolve({ id: 'mock-uuid', ...loan })),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: getRepositoryToken(Loan), useValue: repo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              if (key === 'MAX_ACTIVE_LOANS') return 3;
              if (key === 'MAX_LOAN_DAYS') return 30;
              if (key === 'DAILY_FINE_RATE') return 0.50;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  // Test 1: Camino feliz
  it('crea préstamo exitoso cuando item disponible, usuario bajo límite y fechas válidas', async () => {
    repo.findOne.mockResolvedValue(null); // Item no tiene préstamos activos
    repo.count.mockResolvedValue(1); // Usuario tiene 1 préstamo (límite es 3)

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10); // Devuelve en 10 días

    const result = await service.create({
      userId: 'user-uuid',
      itemId: 'item-uuid',
      dueAt: futureDate.toISOString(),
    });

    expect(result).toBeDefined();
    expect(result.status).toBe(LoanStatus.ACTIVE);
    expect(repo.save).toHaveBeenCalled();
  });

  // Test 2: Regla R2
  it('lanza ConflictException si el item ya tiene un préstamo activo (R2)', async () => {
    // Simulamos que el item ya está prestado
    repo.findOne.mockResolvedValue({ id: 'loan-existente', status: LoanStatus.ACTIVE });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await expect(
      service.create({
        userId: 'user-uuid',
        itemId: 'item-uuid',
        dueAt: futureDate.toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  // Test 3: Regla R3
  it('lanza ConflictException si el usuario ya tiene 3 préstamos activos (R3)', async () => {
    repo.findOne.mockResolvedValue(null);
    // Simulamos que el usuario alcanzó el límite de 3 préstamos
    repo.count.mockResolvedValue(3); 

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await expect(
      service.create({
        userId: 'user-uuid',
        itemId: 'item-uuid',
        dueAt: futureDate.toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  // Test 4: Regla R4
  it('calcula multa correctamente: 5 días de retraso = 2.50 (R4)', async () => {
    // Configuramos una fecha límite de hace 4 días y 23 horas para que el Math.ceil lo redondee a 5 días
    const pastDate = new Date(Date.now() - (5 * 24 * 60 * 60 * 1000) + 1000); 

    const mockLoan = {
      id: 'loan-1',
      status: LoanStatus.ACTIVE,
      dueAt: pastDate,
    };

    repo.findOne.mockResolvedValue(mockLoan); // Al buscarlo en returnLoan, lo encuentra activo

    const result = await service.returnLoan('loan-1');

    expect(result.status).toBe(LoanStatus.RETURNED);
    expect(result.fineAmount).toBe(2.50); // 5 días * 0.50
    expect(repo.save).toHaveBeenCalled();
  });
});