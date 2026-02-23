import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('BondController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /bond/calculate returns metrics and cash flow schedule', async () => {
    const payload = {
      faceValue: 1000,
      annualCouponRatePct: 5,
      marketPrice: 950,
      yearsToMaturity: 10,
      couponFrequency: 'semi-annual',
      settlementDate: '2026-02-23',
    };

    const response = await request(app.getHttpServer())
      .post('/bond/calculate')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        totalPeriods: 20,
        annualCouponAmount: 50,
        couponPayment: 25,
        totalInterestEarned: 500,
        tradingStatus: 'discount',
      }),
    );
    expect(response.body.currentYieldPct).toBeCloseTo((50 / 950) * 100, 6);
    expect(response.body.ytmPct).toBeGreaterThan(response.body.currentYieldPct);
    expect(response.body.effectiveAnnualYieldPct).toBeGreaterThan(response.body.ytmPct);
    expect(response.body.cashFlowSchedule).toHaveLength(20);
    expect(response.body.cashFlowSchedule[0]).toEqual(
      expect.objectContaining({
        period: 1,
        paymentDate: '2026-08-23',
        couponPayment: 25,
        cumulativeInterest: 25,
        remainingPrincipal: 1000,
      }),
    );
    expect(response.body.cashFlowSchedule[19]).toEqual(
      expect.objectContaining({
        period: 20,
        couponPayment: 25,
        cumulativeInterest: 500,
        remainingPrincipal: 0,
      }),
    );
  });

  it('POST /bond/calculate rejects invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/bond/calculate')
      .send({
        faceValue: -1,
        annualCouponRatePct: 5,
        marketPrice: 950,
        yearsToMaturity: 10,
        couponFrequency: 'monthly',
      })
      .expect(400);

    expect(response.body.message).toBeDefined();
  });
});
