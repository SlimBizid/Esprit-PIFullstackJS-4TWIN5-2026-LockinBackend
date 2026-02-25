import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Stub guard: always allows the request.
    // L'implémentation réelle de l'auth sera fournie par ton équipe.
    return true;
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserType } from '../user/enums/user-type.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      return null;
    }
    // S'assure que le type utilisateur est bien mappé sur l'enum
    if (user.type && !(user.type in UserType)) {
      user.type = UserType.PLAYER;
    }
    return user;
  }
}

