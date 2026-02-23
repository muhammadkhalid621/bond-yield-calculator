import { calculateBondMetrics } from './bond-calculation';

describe('calculateBondMetrics', () => {
  it('calculates par bond yields close to coupon rate (annual)', () => {
    const result = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 5,
      marketPrice: 1000,
      yearsToMaturity: 10,
      couponFrequency: 'annual',
      settlementDate: '2026-02-23',
    });

    expect(result.currentYieldPct).toBeCloseTo(5, 6);
    expect(result.ytmPct).toBeCloseTo(5, 4);
    expect(result.tradingStatus).toBe('par');
    expect(result.premiumDiscountAmount).toBe(0);
    expect(result.totalInterestEarned).toBe(500);
  });

  it('classifies discount bond and produces YTM higher than current yield', () => {
    const result = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 5,
      marketPrice: 950,
      yearsToMaturity: 10,
      couponFrequency: 'semi-annual',
      settlementDate: '2026-02-23',
    });

    expect(result.tradingStatus).toBe('discount');
    expect(result.premiumDiscountAmount).toBe(-50);
    expect(result.currentYieldPct).toBeCloseTo((50 / 950) * 100, 6);
    expect(result.ytmPct).toBeGreaterThan(result.currentYieldPct);
  });

  it('classifies premium bond and produces YTM lower than current yield', () => {
    const result = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 6,
      marketPrice: 1080,
      yearsToMaturity: 7,
      couponFrequency: 'semi-annual',
      settlementDate: '2026-02-23',
    });

    expect(result.tradingStatus).toBe('premium');
    expect(result.premiumDiscountAmount).toBe(80);
    expect(result.ytmPct).toBeLessThan(result.currentYieldPct);
  });

  it('handles zero-coupon bond and matches closed-form annual YTM', () => {
    const result = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 0,
      marketPrice: 620.92,
      yearsToMaturity: 10,
      couponFrequency: 'annual',
      settlementDate: '2026-02-23',
    });

    const expectedYtmPct = (Math.pow(1000 / 620.92, 1 / 10) - 1) * 100;

    expect(result.currentYieldPct).toBe(0);
    expect(result.totalInterestEarned).toBe(0);
    expect(result.ytmPct).toBeCloseTo(expectedYtmPct, 3);
  });

  it('builds a cash flow schedule with correct periods and terminal principal repayment', () => {
    const result = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 8,
      marketPrice: 1000,
      yearsToMaturity: 2,
      couponFrequency: 'semi-annual',
      settlementDate: '2026-02-23',
    });

    expect(result.totalPeriods).toBe(4);
    expect(result.cashFlowSchedule).toHaveLength(4);
    expect(result.couponPayment).toBe(40);
    expect(result.cashFlowSchedule[0]).toMatchObject({
      period: 1,
      couponPayment: 40,
      cumulativeInterest: 40,
      remainingPrincipal: 1000,
    });
    expect(result.cashFlowSchedule[3]).toMatchObject({
      period: 4,
      couponPayment: 40,
      cumulativeInterest: 160,
      remainingPrincipal: 0,
    });
    expect(result.totalInterestEarned).toBe(160);
  });

  it('rounds non-integer period counts to nearest coupon period', () => {
    const result = calculateBondMetrics({
      faceValue: 1000,
      annualCouponRatePct: 4,
      marketPrice: 1000,
      yearsToMaturity: 2.5,
      couponFrequency: 'semi-annual',
      settlementDate: '2026-02-23',
    });

    expect(result.totalPeriods).toBe(5);
    expect(result.cashFlowSchedule).toHaveLength(5);
  });
});

