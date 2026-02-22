import {
  Controller,
  Get,
  UseGuards,
  Request,
  NotFoundException,
  Patch,
  Query,
  Body,
  Param,
  ForbiddenException,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { UserType } from './enums/user-type.enum';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: UserType,
    @Query('search') search?: string,
  ) {
    const requesterRole = req.user.type;
    return this.userService.findAll(
      Number(page),
      Number(limit),
      requesterRole,
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
}
