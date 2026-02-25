import {
  Controller,
  Delete,
  Patch,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';

import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserType } from './enums/user-type.enum';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Request() req) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can delete users');
    }

    return this.userService.softRemove(id);
  }

  @Patch('restore/:id')
  async restoreUser(@Param('id') id: string, @Request() req) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can restore users');
    }

    return this.userService.restore(id);
  }
}