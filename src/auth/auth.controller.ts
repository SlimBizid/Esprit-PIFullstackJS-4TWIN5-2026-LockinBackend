import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { SignUpDto } from './dto/signUpDto.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
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
