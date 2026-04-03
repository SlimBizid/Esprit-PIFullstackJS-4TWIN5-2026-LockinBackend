import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // Créer une team
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateTeamDto, @Request() req) {
    if (req.user) {
      return this.teamService.createTeam(dto, req.user.id);
    }
  }
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyTeams(@Request() req: any) {
    return this.teamService.findMyTeams(req.user.id);
  }

  // Lister toutes les teams
  @Get()
  findAll() {
    return this.teamService.findAll();
  }

  // Récupérer une team
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findOne(id);
  }

  // Mettre à jour le nom de la team
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamDto) {
    return this.teamService.updateTeam(id, dto);
  }

  // Supprimer une team
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.deleteTeam(id);
  }

  // Supprimer un utilisateur de la team
  @Delete(':id/users/:userId')
  removeUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
  ) {
    return this.teamService.removeUser(id, userId);
  }

  // Inviter un utilisateur
  @Post(':id/invite/:userId')
  inviteUser(
    @Param('id', ParseIntPipe) teamId: number,
    @Param('userId') userId: string,
  ) {
    return this.teamService.inviteUser(teamId, userId);
  }

  // Accepter invitation
  @Post(':id/accept')
  acceptInvitation(
    @Param('id', ParseIntPipe) teamId: number,
    @Body('userId') userId: string,
  ) {
    return this.teamService.acceptInvitation(teamId, userId);
  }

  // Refuser invitation
  @Post(':id/decline')
  declineInvitation(
    @Param('id', ParseIntPipe) teamId: number,
    @Body('userId') userId: string,
  ) {
    return this.teamService.declineInvitation(teamId, userId);
  }
}
