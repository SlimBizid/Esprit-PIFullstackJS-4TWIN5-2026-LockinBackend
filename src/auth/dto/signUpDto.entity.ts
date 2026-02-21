import { IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  username: string;

  @IsOptional()
  githubHandle?: string;
}
