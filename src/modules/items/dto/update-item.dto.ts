import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class UpdateItemDto {
  @ApiPropertyOptional({ example: 'Clean Code - Revised' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: ItemType })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;
}