import { Controller, Get, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';

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
}