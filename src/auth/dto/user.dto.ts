import { UserType } from 'src/user/enums/user-type.enum';

export type UserDTO = {
  id: string;

  username: string;

  githubHandle: string;

  email: string;

  type: UserType;

  createdAt: Date;

  updatedAt: Date;
};
