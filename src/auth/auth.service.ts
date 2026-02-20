import { Injectable } from '@nestjs/common';
import { UserType } from 'src/user/enums/user-type.enum';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async SignUp(
    username: string,
    email: string,
    password: string,
    githubHandle?: string,
  ): Promise<void> {
    return this.userService.CreateUser(username, email, password, githubHandle);
  }
}
