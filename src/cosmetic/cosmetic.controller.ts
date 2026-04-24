import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserType } from '../user/enums/user-type.enum';
import { CosmeticService } from './cosmetic.service';
import { CreateCosmeticDto } from './dto/create-cosmetic.dto';
import { UpdateCosmeticDto } from './dto/update-cosmetic.dto';

@Controller('cosmetics')
export class CosmeticController {
  constructor(private readonly cosmeticService: CosmeticService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.cosmeticService.findAll(Number(page), Number(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Get('available-rewards')
  async findAvailableRewards() {
    return this.cosmeticService.findAvailableRewards();
  }

  @UseGuards(JwtAuthGuard)
  @Get('shop')
  async findShop(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.cosmeticService.findShopCosmetics(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.cosmeticService.findOneForUser(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('buy/:id')
  async buy(@Param('id') id: string, @Request() req) {
    return this.cosmeticService.buy(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCosmeticDto, @Request() req) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can create cosmetics');
    }
    return this.cosmeticService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCosmeticDto,
    @Request() req,
  ) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can update cosmetics');
    }
    return this.cosmeticService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only admin can delete cosmetics');
    }
    await this.cosmeticService.remove(id);
    return { message: 'Cosmetic deleted successfully' };
  }
}
