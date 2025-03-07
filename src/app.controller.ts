import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/scrap-all')
  scrapAll(@Query() query) {
    return this.appService.scrapAll(query.page);
  }
}
