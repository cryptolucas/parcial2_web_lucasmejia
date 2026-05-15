import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 'uuid-del-usuario' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'uuid-del-item' })
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @ApiProperty({ example: '2026-05-30T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  dueAt!: string;
}