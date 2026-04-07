import { PartialType } from '@nestjs/mapped-types';
import { createUserDto } from './create-user.dto';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(createUserDto) {
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
