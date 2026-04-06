import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { SignUpDto } from './dto/signUpDto.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { CookieOptions, Response } from 'express';
import { RefreshTokenGuard } from './token-blacklist/refresh-token.guard';
import { User } from 'src/user/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
@Post('login')
async login(@Request() req, @Res({ passthrough: true }) res: Response) {
  await this.authService.awardLoginXp(req.user.id);  
  this.authService.setTokenCookies(res, req.user);
  return this.authService.getUserDTO(req.user);
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

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
  @Post('logout')
  async logout(
    @Request() req: { cookies: { refresh_token: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(res, req.cookies?.refresh_token);
    return { ok: true };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(
    @Request() req: { user: User; cookies: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(res, req.user, req.cookies.refresh_token);
  }
}
