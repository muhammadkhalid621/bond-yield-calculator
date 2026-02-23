import { Body, Controller, Get, Post } from '@nestjs/common';
import { BondService } from './bond.service';
import { CalculateBondDto } from './dto/calculate-bond.dto';

@Controller('bond')
export class BondController {
  constructor(private readonly bondService: BondService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Post('calculate')
  calculate(@Body() dto: CalculateBondDto) {
    return this.bondService.calculate(dto);
  }
}

