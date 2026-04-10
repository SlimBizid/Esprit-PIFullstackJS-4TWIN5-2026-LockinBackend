import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { UserType } from './enums/user-type.enum';
import { type UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // Return all users (without sensitive data) i need it please don't delete it for now
  @Get('/all-for-invite')
  async findAllForInvite(): Promise<Partial<User>[]> {
    const { data } = await this.userService.findAll(1, 1000, 'user');
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req) {
    const user = await this.userService.findByUsername(req.user.username);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      username: user.username,
      email: user.email,
      type: user.type,
      githubHandle: user.githubHandle,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('profile/:username')
  async getProfile(@Request() req, @Param('username') username: string) {
    return this.userService.getProfile(username);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('edit')
  async editProfile(
    @Request() req: Request & { user: User },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(req.user, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: UserType,
    @Query('search') search?: string,
  ) {
    const isAdmin = req.user.type === UserType.ADMIN;

    if (isAdmin) {
      return this.userService.findAllForAdmin(
        Number(page),
        Number(limit),
        type,
        search,
      );
    }

    return this.userService.findAllForPlayer(
      Number(page),
      Number(limit),
      type,
      search,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body('type') updated_role: UserType,
    @Request() req,
  ) {
    if (req.user.type != UserType.ADMIN) {
      throw new ForbiddenException();
    }

    return this.userService.updateUserRole(id, updated_role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Request() req) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can delete users');
    }
    return this.userService.softRemove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('restore/:id')
  async restoreUser(@Param('id') id: string, @Request() req) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can restore users');
    }
    return this.userService.restore(id);
  }
}
