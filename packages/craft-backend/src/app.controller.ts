import { Controller, Get, Post, Version } from '@nestjs/common'
import { AppService } from '@/app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Post()
  @Version('2')
  testVersion(): string {
    return 'this is version 2'
  }

  @Get('/error')
  getError() {
    throw new Error('An error occurred')
    // return 123
  }
}
