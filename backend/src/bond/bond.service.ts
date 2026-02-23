import { BadRequestException, Injectable } from '@nestjs/common';
import { CalculateBondDto } from './dto/calculate-bond.dto';
import { calculateBondMetrics, validateBondInput } from './bond-calculation';

@Injectable()
export class BondService {
  calculate(dto: CalculateBondDto) {
    const errors = validateBondInput(dto);
    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors });
    }
    return calculateBondMetrics(dto);
  }
}
