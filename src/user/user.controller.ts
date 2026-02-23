import { Controller, Delete, Patch, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.userService.softRemove(id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.userService.restore(id);
  }
}