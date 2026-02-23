export type CouponFrequency = 'annual' | 'semi-annual';

export interface BondCalculationInput {
  faceValue: number;
  annualCouponRatePct: number;
  marketPrice: number;
  yearsToMaturity: number;
  couponFrequency: CouponFrequency;
  settlementDate?: string;
}

export interface CashFlowRow {
  period: number;
  paymentDate: string;
  couponPayment: number;
  cumulativeInterest: number;
  remainingPrincipal: number;
}

export interface BondCalculationResult {
  inputs: BondCalculationInput;
  annualCouponAmount: number;
  couponPayment: number;
  totalPeriods: number;
  currentYieldPct: number;
  ytmPct: number;
  totalInterestEarned: number;
  tradingStatus: 'premium' | 'discount' | 'par';
  premiumDiscountAmount: number;
  cashFlowSchedule: CashFlowRow[];
}

