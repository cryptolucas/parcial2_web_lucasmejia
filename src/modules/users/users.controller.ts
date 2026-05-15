import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersDto } from './dto/find-users.dto';

@ApiTags('users')
@ApiBearerAuth() // Exige que todas las rutas de este controlador tengan el token JWT
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Permitimos que tanto el Admin como el Bibliotecario puedan listar a todos los usuarios
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @Get()
  findAll(@Query() query: FindUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    // Un usuario puede ver su propio perfil, pero Admin y Bibliotecario pueden ver el de todos
    if (
      actor.id !== id && 
      actor.role !== UserRole.ADMIN && 
      actor.role !== UserRole.LIBRARIAN
    ) {
      throw new ForbiddenException('No autorizado para ver este perfil');
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  // El borrado (desactivación) es una acción destructiva, la dejamos solo para el ADMIN
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.softDelete(id);
  }
}