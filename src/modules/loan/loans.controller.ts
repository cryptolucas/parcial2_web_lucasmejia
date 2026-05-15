import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';

@ApiTags('loans')
@ApiBearerAuth() // Protegidos con JWT
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // 201
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK) // 200
  findAll(@Query() query: FindLoansDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loansService.findOne(id);
  }

  // Rutas custom sin body
  @Patch(':id/return')
  @HttpCode(HttpStatus.OK) // 200
  returnLoan(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loansService.returnLoan(id);
  }

  @Patch(':id/mark-lost')
  @HttpCode(HttpStatus.OK) // 200
  markLost(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loansService.markLost(id);
  }
}