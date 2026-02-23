import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import type { BondCalculationInput, BondCalculationResult, CouponFrequency } from './types';

type FormState = BondCalculationInput;

const defaultForm: FormState = {
  faceValue: 1000,
  annualCouponRatePct: 5,
  marketPrice: 950,
  yearsToMaturity: 10,
  couponFrequency: 'semi-annual',
  settlementDate: new Date().toISOString().slice(0, 10),
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(3)}%`;
}

function statusLabel(status: BondCalculationResult['tradingStatus']): string {
  if (status === 'premium') return 'Trading at Premium';
  if (status === 'discount') return 'Trading at Discount';
  return 'Trading at Par';
}

export default function App() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<BondCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const annualCouponPreview = useMemo(
    () => (Number(form.faceValue) * Number(form.annualCouponRatePct || 0)) / 100,
    [form.faceValue, form.annualCouponRatePct],
  );

  const handleNumberChange =
    (key: keyof Pick<FormState, 'faceValue' | 'annualCouponRatePct' | 'marketPrice' | 'yearsToMaturity'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({
        ...prev,
        [key]: value === '' ? ('' as unknown as number) : Number(value),
      }));
    };

  const handleFrequencyChange = (couponFrequency: CouponFrequency) => {
    setForm((prev) => ({ ...prev, couponFrequency }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/bond/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        const message =
          Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Request failed';
        throw new Error(message);
      }

      setResult(data as BondCalculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Fixed Income Toolkit</p>
        <h1>Bond Yield Calculator</h1>
        <p className="subtitle">
          Compute current yield, YTM, and a period-by-period coupon schedule for plain vanilla bonds.
        </p>
      </section>

      <section className="panel-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-head">
            <h2>Inputs</h2>
            <p>Enter bond assumptions and calculate metrics.</p>
          </div>

          <div className="field-grid">
            <label>
              Face value
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number.isFinite(form.faceValue) ? form.faceValue : ''}
                onChange={handleNumberChange('faceValue')}
                required
              />
            </label>

            <label>
              Annual coupon rate (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={Number.isFinite(form.annualCouponRatePct) ? form.annualCouponRatePct : ''}
                onChange={handleNumberChange('annualCouponRatePct')}
                required
              />
            </label>

            <label>
              Market price
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number.isFinite(form.marketPrice) ? form.marketPrice : ''}
                onChange={handleNumberChange('marketPrice')}
                required
              />
            </label>

            <label>
              Years to maturity
              <input
                type="number"
                min="0"
                step="0.5"
                value={Number.isFinite(form.yearsToMaturity) ? form.yearsToMaturity : ''}
                onChange={handleNumberChange('yearsToMaturity')}
                required
              />
            </label>

            <label>
              Settlement date
              <input
                type="date"
                value={form.settlementDate ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, settlementDate: e.target.value }))}
              />
            </label>

            <fieldset className="frequency-group">
              <legend>Coupon frequency</legend>
              <div className="segmented">
                <button
                  type="button"
                  className={form.couponFrequency === 'annual' ? 'active' : ''}
                  onClick={() => handleFrequencyChange('annual')}
                >
                  Annual
                </button>
                <button
                  type="button"
                  className={form.couponFrequency === 'semi-annual' ? 'active' : ''}
                  onClick={() => handleFrequencyChange('semi-annual')}
                >
                  Semi-annual
                </button>
              </div>
            </fieldset>
          </div>

          <div className="inline-note">
            Estimated annual coupon amount: <strong>{formatCurrency(annualCouponPreview || 0)}</strong>
          </div>

          <button className="cta" type="submit" disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate Bond Yield'}
          </button>

          {error ? <p className="error">{error}</p> : null}
        </form>

        <section className="panel result-panel">
          <div className="panel-head">
            <h2>Outputs</h2>
            <p>Core yield and pricing metrics.</p>
          </div>

          {result ? (
            <>
              <div className="metric-grid">
                <article className="metric-card">
                  <span>Current Yield</span>
                  <strong>{formatPercent(result.currentYieldPct)}</strong>
                </article>
                <article className="metric-card">
                  <span>YTM (Annualized)</span>
                  <strong>{formatPercent(result.ytmPct)}</strong>
                </article>
                <article className="metric-card">
                  <span>Effective Annual Yield</span>
                  <strong>{formatPercent(result.effectiveAnnualYieldPct)}</strong>
                </article>
                <article className="metric-card">
                  <span>Total Interest Earned</span>
                  <strong>{formatCurrency(result.totalInterestEarned)}</strong>
                </article>
                <article className="metric-card">
                  <span>Pricing Status</span>
                  <strong>{statusLabel(result.tradingStatus)}</strong>
                  <small>
                    {result.tradingStatus === 'par'
                      ? 'At face value'
                      : `${result.tradingStatus === 'premium' ? '+' : '-'}${formatCurrency(
                          Math.abs(result.premiumDiscountAmount),
                        )} vs face`}
                  </small>
                </article>
              </div>

              <div className="schedule-panel">
                <div className="schedule-header">
                  <h3>Cash Flow Schedule</h3>
                  <p>
                    {result.totalPeriods} periods • Coupon payment {formatCurrency(result.couponPayment)}
                  </p>
                </div>

                <div className="table-wrap" role="region" aria-label="Cash flow schedule">
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Payment Date</th>
                        <th>Coupon Payment</th>
                        <th>Cumulative Interest</th>
                        <th>Remaining Principal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.cashFlowSchedule.map((row) => (
                        <tr key={`${row.period}-${row.paymentDate}`}>
                          <td>{row.period}</td>
                          <td>{row.paymentDate}</td>
                          <td>{formatCurrency(row.couponPayment)}</td>
                          <td>{formatCurrency(row.cumulativeInterest)}</td>
                          <td>{formatCurrency(row.remainingPrincipal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Run a calculation to see yield metrics and the cash flow schedule.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
