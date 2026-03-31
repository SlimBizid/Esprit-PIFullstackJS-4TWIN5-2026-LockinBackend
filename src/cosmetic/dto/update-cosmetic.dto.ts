import { PartialType } from '@nestjs/mapped-types';
import { CreateCosmeticDto } from './create-cosmetic.dto';

export class UpdateCosmeticDto extends PartialType(CreateCosmeticDto) {}
