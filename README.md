# Bond Yield Calculator Take-Home

Monorepo with:

- `backend` - NestJS API (`POST /bond/calculate`)
- `frontend` - React app (Vite + TypeScript)
- `shared` - Optional extracted bond pricing module (included as a reusable reference)

## Features

- Inputs: face value, annual coupon rate, market price, years to maturity, coupon frequency
- Outputs: current yield, YTM, total interest, premium/discount indicator
- Cash flow schedule table with payment dates and running totals
- Backend tests (unit + API integration)

## Quick Start

### 1) Backend

```bash
cd backend
npm install
npm run start:dev
```

API runs on `http://localhost:3001`.

Run backend unit tests:

```bash
npm test
```

This runs:

- calculation engine unit tests
- `POST /bond/calculate` integration tests

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`.

### Root workspace shortcuts (optional)

From repo root:

```bash
npm install
npm run dev:backend
```

In a second terminal:

```bash
npm run dev:frontend
```

Run backend tests from root:

```bash
npm run test:backend
```

Optional frontend env var:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

## Notes

- YTM is calculated numerically (Newton-Raphson with bisection fallback) using the standard bond price equation.
- Reported YTM is annualized nominal yield based on coupon frequency (`periodic_yield * frequency`).
- Payment dates are projected forward from the calculation date.
- `totalPeriods` is derived as `round(yearsToMaturity * couponFrequency)` for this take-home.

## Interview Prep Docs

- `AI_NOTES.md` - how the agent was used and prompting strategy
- `ARCHITECTURE.md` - formulas, assumptions, and test strategy
