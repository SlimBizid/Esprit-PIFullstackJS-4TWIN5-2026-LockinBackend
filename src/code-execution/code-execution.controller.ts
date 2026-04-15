import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

import { RunCodeDto } from './dto/run-code.dto';
import { CodeExecutionService } from './code-execution.service';

@Controller('code')
@UseGuards(JwtAuthGuard)
export class CodeExecutionController {
  constructor(private readonly codeExecutionService: CodeExecutionService) {}

  @Post('run')
  async runCode(@Body() dto: RunCodeDto) {
    return this.codeExecutionService.runCode(dto);
  }
}
