import { Controller, Body, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUpDto.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('signup')
  signUp(@Body() user: SignUpDto) {
    return this.authService.SignUp(
      user.username,
      user.email,
      user.password,
      user.githubHandle,
    );
  }
}
