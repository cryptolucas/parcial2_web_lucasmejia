import {
  Body,
  Controller,
  Delete,
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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FindItemsDto } from './dto/find-items.dto';

@ApiTags('items')
@ApiBearerAuth() // Todos autenticados, sin @Public()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // 201
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK) // 200
  findAll(@Query() query: FindItemsDto) {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK) // 200
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 DELETE
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.itemsService.remove(id);
  }
}