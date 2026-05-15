import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Loan])],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}