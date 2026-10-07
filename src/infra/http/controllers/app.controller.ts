import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Get Health Check information' })
  @ApiResponse({ status: 200, description: 'OK!' })
  @Get('/health')
  health(): { health: boolean } {
    return { health: true };
  }
}
