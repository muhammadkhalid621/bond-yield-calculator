import { IsIn, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateBondDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  faceValue!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  annualCouponRatePct!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  marketPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  yearsToMaturity!: number;

  @IsIn(['annual', 'semi-annual'])
  couponFrequency!: 'annual' | 'semi-annual';

  @IsOptional()
  settlementDate?: string;
}

