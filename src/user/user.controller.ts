import { Controller, Delete, Patch, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { UseGuards, Request, ForbiddenException } from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport'; 



@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'))
@Delete(':id')
async deleteUser(@Param('id') id: string, @Request() req) {

  if (req.user.type !== 'ADMIN') {
    throw new ForbiddenException('Only admin can delete users');
  }

  return this.userService.softRemove(id);
}

 @UseGuards(AuthGuard('jwt'))
@Patch('restore/:id')
async restoreUser(@Param('id') id: string, @Request() req) {

  if (req.user.type !== 'ADMIN') {
    throw new ForbiddenException('Only admin can restore users');
  }

  return this.userService.restore(id);
}
}