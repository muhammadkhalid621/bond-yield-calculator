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

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round6(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function priceFromPeriodicYield(
  periodicYield: number,
  couponPayment: number,
  faceValue: number,
  periods: number,
): number {
  if (Math.abs(periodicYield) < 1e-12) return couponPayment * periods + faceValue;

  let pv = 0;
  for (let t = 1; t <= periods; t += 1) {
    pv += couponPayment / Math.pow(1 + periodicYield, t);
  }
  pv += faceValue / Math.pow(1 + periodicYield, periods);
  return pv;
}

function derivativePriceFromPeriodicYield(
  periodicYield: number,
  couponPayment: number,
  faceValue: number,
  periods: number,
): number {
  let derivative = 0;
  for (let t = 1; t <= periods; t += 1) {
    derivative += (-t * couponPayment) / Math.pow(1 + periodicYield, t + 1);
  }
  derivative += (-periods * faceValue) / Math.pow(1 + periodicYield, periods + 1);
  return derivative;
}

function solvePeriodicYtm(
  marketPrice: number,
  couponPayment: number,
  faceValue: number,
  periods: number,
  frequencyPerYear: number,
  couponRateDecimal: number,
): number {
  let x = Math.max(-0.95, couponRateDecimal / frequencyPerYear);

  for (let i = 0; i < 50; i += 1) {
    const fx = priceFromPeriodicYield(x, couponPayment, faceValue, periods) - marketPrice;
    if (Math.abs(fx) < 1e-10) return x;

    const dfx = derivativePriceFromPeriodicYield(x, couponPayment, faceValue, periods);
    if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-12) break;

    const next = x - fx / dfx;
    if (!Number.isFinite(next) || next <= -0.999999 || next > 10) break;
    if (Math.abs(next - x) < 1e-12) return next;
    x = next;
  }

  let low = -0.99;
  let high = 1.0;
  let fLow = priceFromPeriodicYield(low, couponPayment, faceValue, periods) - marketPrice;
  let fHigh = priceFromPeriodicYield(high, couponPayment, faceValue, periods) - marketPrice;

  let expandCount = 0;
  while (fLow * fHigh > 0 && expandCount < 20) {
    high *= 2;
    fHigh = priceFromPeriodicYield(high, couponPayment, faceValue, periods) - marketPrice;
    expandCount += 1;
  }

  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const fMid = priceFromPeriodicYield(mid, couponPayment, faceValue, periods) - marketPrice;
    if (Math.abs(fMid) < 1e-10) return mid;

    if (fLow * fMid <= 0) {
      high = mid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
}

export function validateBondInput(input: BondCalculationInput): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(input.faceValue) || input.faceValue <= 0) errors.push('Face value must be positive.');
  if (!Number.isFinite(input.annualCouponRatePct) || input.annualCouponRatePct < 0) {
    errors.push('Annual coupon rate must be zero or greater.');
  }
  if (!Number.isFinite(input.marketPrice) || input.marketPrice <= 0) {
    errors.push('Market price must be positive.');
  }
  if (!Number.isFinite(input.yearsToMaturity) || input.yearsToMaturity <= 0) {
    errors.push('Years to maturity must be positive.');
  }
  if (!['annual', 'semi-annual'].includes(input.couponFrequency)) {
    errors.push('Coupon frequency must be annual or semi-annual.');
  }
  if (input.settlementDate && Number.isNaN(new Date(input.settlementDate).getTime())) {
    errors.push('Settlement date is invalid.');
  }

  return errors;
}

export function calculateBondMetrics(input: BondCalculationInput): BondCalculationResult {
  const frequencyPerYear = input.couponFrequency === 'annual' ? 1 : 2;
  const totalPeriods = Math.round(input.yearsToMaturity * frequencyPerYear);
  if (totalPeriods <= 0) throw new Error('Total periods must be at least 1.');

  const couponRateDecimal = input.annualCouponRatePct / 100;
  const annualCouponAmount = input.faceValue * couponRateDecimal;
  const couponPayment = annualCouponAmount / frequencyPerYear;
  const currentYieldPct = (annualCouponAmount / input.marketPrice) * 100;

  const periodicYtm = solvePeriodicYtm(
    input.marketPrice,
    couponPayment,
    input.faceValue,
    totalPeriods,
    frequencyPerYear,
    couponRateDecimal,
  );

  const settlement = input.settlementDate ? new Date(input.settlementDate) : new Date();
  const monthsPerPeriod = 12 / frequencyPerYear;
  let cumulativeInterest = 0;

  const cashFlowSchedule: CashFlowRow[] = Array.from({ length: totalPeriods }, (_, index) => {
    const period = index + 1;
    cumulativeInterest += couponPayment;
    const paymentDate = addMonthsClamped(settlement, monthsPerPeriod * period);
    return {
      period,
      paymentDate: paymentDate.toISOString().slice(0, 10),
      couponPayment: round2(couponPayment),
      cumulativeInterest: round2(cumulativeInterest),
      remainingPrincipal: period === totalPeriods ? 0 : round2(input.faceValue),
    };
  });

  const premiumDiscountAmount = input.marketPrice - input.faceValue;

  return {
    inputs: {
      ...input,
      settlementDate: settlement.toISOString().slice(0, 10),
    },
    annualCouponAmount: round2(annualCouponAmount),
    couponPayment: round2(couponPayment),
    totalPeriods,
    currentYieldPct: round6(currentYieldPct),
    ytmPct: round6(periodicYtm * frequencyPerYear * 100),
    totalInterestEarned: round2(couponPayment * totalPeriods),
    tradingStatus: premiumDiscountAmount > 0 ? 'premium' : premiumDiscountAmount < 0 ? 'discount' : 'par',
    premiumDiscountAmount: round2(premiumDiscountAmount),
    cashFlowSchedule,
  };
}

