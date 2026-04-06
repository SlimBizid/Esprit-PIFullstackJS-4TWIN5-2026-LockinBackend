import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMatchMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
