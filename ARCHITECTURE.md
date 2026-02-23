# Architecture and Calculation Notes

## Project Structure

- `frontend/` React + Vite UI (TypeScript)
- `backend/` NestJS API (TypeScript)
- `shared/` Optional extracted bond calculation reference module

## Backend Flow

1. `POST /bond/calculate` receives payload
2. DTO validation checks input shape/ranges
3. Service runs the bond calculation engine
4. API returns metrics plus cash flow schedule

Key files:

- `backend/src/bond/dto/calculate-bond.dto.ts`
- `backend/src/bond/bond.controller.ts`
- `backend/src/bond/bond.service.ts`
- `backend/src/bond/bond-calculation.ts`

## Frontend Flow

1. User enters bond assumptions
2. React sends request to backend
3. UI renders outputs and cash flow schedule table

Key files:

- `frontend/src/App.tsx`
- `frontend/src/types.ts`
- `frontend/src/styles.css`

## Bond Formulas

### Current Yield

`currentYield = annualCouponAmount / marketPrice`

Where:

- `annualCouponAmount = faceValue * annualCouponRate`

### Bond Price Equation (for YTM solving)

For periodic yield `r`, coupon `C`, face `F`, periods `n`:

`Price = Σ(C / (1 + r)^t) + F / (1 + r)^n` for `t = 1..n`

### Yield to Maturity (YTM)

- Solved numerically for periodic yield.
- Method:
  - Newton-Raphson first (fast convergence)
  - Bisection fallback (more robust when Newton fails)
- Returned YTM is annualized nominal yield:
  - `ytmPct = periodicYield * frequencyPerYear * 100`

### Effective Annual Yield (EAY)

- Derived from periodic YTM:
  - `effectiveAnnualYieldPct = ((1 + periodicYield) ^ frequencyPerYear - 1) * 100`
- For annual coupons, EAY equals nominal YTM.

## Cash Flow Schedule

Each row includes:

- period
- payment date
- coupon payment
- cumulative interest
- remaining principal

Logic:

- Coupon payment is constant (`annualCouponAmount / frequency`)
- Remaining principal stays at face value until final period, then becomes `0`
- Payment dates are projected from the settlement date using 12-month or 6-month increments

## Assumptions and Limitations

1. Plain-vanilla fixed-rate bonds only
2. No accrued interest / day-count / settlement lag / clean-vs-dirty pricing
3. Both nominal annualized YTM and EAY are returned
4. Period handling simplification:
- `totalPeriods = round(yearsToMaturity * frequencyPerYear)`
- Example: `2.5 years` with semi-annual coupons => `5 periods`

Potential interview extension:

- Enforce exact coupon-period alignment and reject non-integer period counts instead of rounding.

## Testing Strategy

- Unit tests: `backend/src/bond/bond-calculation.spec.ts`
  - par/premium/discount behavior
  - zero-coupon sanity check
  - schedule integrity
  - period rounding behavior

- Integration tests: `backend/src/bond/bond.controller.spec.ts`
  - endpoint success response shape and values
  - invalid payload rejection
