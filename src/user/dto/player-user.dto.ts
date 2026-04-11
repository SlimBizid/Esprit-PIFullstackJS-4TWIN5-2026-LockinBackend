import { UserType } from '../enums/user-type.enum';

export class PlayerUserDto {
  username: string;
  githubHandle: string;
  type: UserType;
}
