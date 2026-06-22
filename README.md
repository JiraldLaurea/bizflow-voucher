# BizFlow Voucher Engine — MVP

A performance-trackable voucher marketing engine for SMEs. Turns ad/QR engagement
into a measurable funnel: **landing page → lead capture → limited-quantity voucher
issuance → SMS delivery → in-store redemption → performance dashboard.**

Built from the Business Plan's MVP scope (§15.1). Stack: **Next.js 14 (App Router,
TypeScript) · PostgreSQL + Prisma · JWT/cookie auth · pluggable SMS · Tailwind.**

## The 15 MVP must-have features (§15.1) → where they live

| # | Feature | Implementation |
|---|---------|----------------|
| 1 | Business account creation | `POST /api/businesses`, `/businesses/new` |
| 2 | Campaign creation | `POST /api/campaigns`, `/campaigns/new` |
| 3 | Voucher rule setup | Campaign form (limits, daily cap, slot cap, first-time, expiry, prefix) |
| 4 | Landing page creation | `/claim/[slug]` (config-driven, mobile-first) |
| 5 | Customer form submission | `ClaimForm` → `POST /api/claim` |
| 6 | Date & time selection | `ClaimForm` date/time selectors + slot capacity |
| 7 | Phone number validation | `src/lib/phone.ts` (libphonenumber-js, PH default) |
| 8 | Duplicate claim prevention | Unique `(campaignId, phone)` + pre-check in engine |
| 9 | Unique voucher code generation | `src/lib/voucher-code.ts` + unique constraint |
| 10 | SMS voucher delivery | `src/lib/sms/*` (mock/Semaphore/Twilio) |
| 11 | Voucher validation page | `/validate` + `POST /api/vouchers/validate` |
| 12 | Manual code redemption | `POST /api/vouchers/redeem` (transactional) |
| 13 | Basic dashboard | `/dashboard`, `/campaigns/[id]` + `src/lib/metrics.ts` |
| 14 | CSV export | `GET /api/export?type=leads\|vouchers` |
| 15 | Admin user management | `/users`, `POST /api/users`, role-based access |

The **voucher engine** (`src/lib/voucher-engine.ts`) is the core: it issues vouchers
inside a PostgreSQL transaction with `SELECT … FOR UPDATE` row locking, so concurrent
claims can never oversell the total/daily limits, and enforces first-time-customer,
time-slot-capacity, and campaign-window rules.

## Getting started

Prerequisites: Node 18+ and a PostgreSQL database (local Postgres or a Supabase
connection string).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL to your Postgres/Supabase connection string
#   - set AUTH_SECRET to a long random string
#   - SMS_PROVIDER defaults to "mock" (logs SMS to the console, no account needed)

# 3. Create the schema and seed demo data (admin + 3 pilot campaigns from §23)
npx prisma migrate dev --name init
npm run db:seed

# 4. Run
npm run dev      # http://localhost:3000
```

### Demo logins (from the seed)

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | `admin@bizflow.test` | `admin1234` |
| Business Owner | `owner@vinepatio.test` | `owner1234` |
| Store Staff | `staff@vinepatio.test` | `staff1234` |

### Try the full funnel

1. Open a public claim page: **http://localhost:3000/claim/vine-dinner-weekend**
2. Submit the form → you get a voucher code + QR; the SMS body prints in the
   `npm run dev` console (mock provider).
3. Sign in as staff and go to **/validate**, enter the code, and mark it used.
4. Sign in as admin/owner → **/campaigns/[id]** shows the funnel metrics; export CSV.

Other seeded campaigns: `/claim/glow-consult`, `/claim/pet-checkup`.

## Architecture notes & deliberate MVP boundaries

- **Auth** is a self-contained JWT-in-httpOnly-cookie scheme (`src/lib/auth.ts`) so the
  app runs with zero external auth setup. Swappable for Supabase Auth / Auth.js later.
- **SMS** is behind a provider interface (`src/lib/sms/types.ts`). `mock` is the default;
  `semaphore` (PH aggregator) and `twilio` are implemented and selected via `SMS_PROVIDER`.
- **RBAC** (`src/lib/rbac.ts`) implements the 5 roles in §16.3; store staff see only the
  validation tool and minimal voucher data.
- **Compliance** (§16): consent text is stored verbatim per lead (`ConsentRecord`),
  there is a per-business opt-out suppression list honored before every SMS, and an
  `AuditLog` records redemptions.
- **Out of scope (later phases, §15.2/§15.3):** comment-to-DM automation (Meta/TikTok/
  WhatsApp APIs), QR *scanning* hardware flow, ad-spend/reach/ROAS metrics (need ad-platform
  integration), CRM segmentation, campaign cloning, and all AI features. The dashboard shows
  the funnel the platform owns end-to-end; upstream ad metrics are intentionally omitted.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Prisma generate + production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run db:seed` | Seed admin + pilot campaigns |
| `npm run prisma:studio` | Browse the database |
