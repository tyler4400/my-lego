import type { Request } from 'express'
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '@/guard/jwt-auth.guard'
import { CreateDto } from '@/module/work/dto/create-dto'
import { WorkService } from '@/module/work/work.service'

@Controller('work')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createWork(@Req() req: Request, @Body() dto: CreateDto) {
    return this.workService.createWork(dto, req.user!)
  }
}
