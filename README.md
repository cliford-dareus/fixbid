# FixBid

**Handyman quoting made simple.**

FixBid is a mobile app for independent handymen and small contractors. Snap photos of a job, get smart template suggestions, build professional quotes with line items, share PDFs, and collect deposits online — all in one place.

Built for real field work: fast quote creation, client tracking, job management, and a polished public quote page clients can open from a link.

---

## Features

- **Photo → Quote** — Take or upload job photos; the app suggests matching templates (drywall, plumbing, electrical, painting, hurricane prep, and more)
- **Job templates** — Dozens of realistic templates with labor rates, materials, upsells, difficulty, and regional cost multipliers
- **Line items** — Labor and materials with quantities, unit prices, and optional before photos
- **Clients** — Save clients and attach them to quotes, or enter a name/phone on the fly
- **PDF quotes** — Generate and share professional PDFs via text, email, or WhatsApp
- **Public quote page** — Clients view a branded quote in the browser and can pay a 50% deposit via Stripe
- **Jobs dashboard** — Track scheduled / in-progress / completed jobs and monthly revenue
- **Profile & payments** — Business profile, branding for PDFs, and Stripe Connect setup
- **Auth** — Email/password sign-up and sign-in via Supabase Auth

---

## Tech stack

| Layer | Technology |
|--------|------------|
| App | [Expo](https://expo.dev) (SDK 55), React Native, React 19 |
| Routing | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS for RN) |
| Backend | [Supabase](https://supabase.com) (Auth, Postgres, Storage, Edge Functions) |
| Payments | Stripe (`@stripe/stripe-react-native` + Checkout for deposits) |
| UI extras | Reanimated, BlurView, GlassView, Lucide icons |

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go (for quick device testing) or iOS Simulator / Android emulator
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for payments)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/cliford-dareus/fixbid.git
cd fixbid
npm install
```

### 2. Environment variables

Create a `.env` file in the project root (Expo loads `EXPO_PUBLIC_*` at build time):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> Never commit service-role keys or secret Stripe keys. Use the **anon** Supabase key and **publishable** Stripe key only in the client.

### 3. Supabase

Expected tables (adjust names/columns to match your schema):

- `profiles` — handyman profile (`full_name`, `business_name`, `phone`, `address`, `hourly_rate`, `logo_url`, `stripe_account_id`, …)
- `clients` — clients linked to `handyman_id`
- `quotes` — quotes with `handyman_id`, `client_id`, `client_name`, `job_name`, `total_amount`, `status`, `photos`, `notes`, …
- `quote_line_items` — line items with `quote_id`, `description`, `quantity`, `unit_price`, `is_labor`, `photo_url`
- `jobs` — scheduled / completed work derived from accepted quotes

Storage bucket: `quote-photos` (public read or signed URLs as needed).

Edge functions used by the public quote page:

- `public-quote` — load quote + handyman by id
- `create-checkout-session` — Stripe Checkout for deposit

Configure Row Level Security so users only read/write their own rows.

### 4. Stripe

- Set the publishable key in `.env`
- Update the merchant identifier in `app.json` under the `@stripe/stripe-react-native` plugin if you use Apple Pay
- Wire Stripe Connect / Checkout in your Supabase edge functions for deposits

### 5. Run the app

```bash
npm start
# or
npx expo start
```

Then press `i` (iOS), `a` (Android), or scan the QR code with Expo Go.

```bash
npm run ios
npm run android
npm run web
```

---

## Project structure

```
app/
  (auth)/          # Sign-in / sign-up
  (tabs)/          # Main tabs: Dashboard, Quotes, Templates, Clients, Jobs
  quote/           # New quote + quote detail
  client/          # Client detail / create
  job/             # Job detail
  settings/        # Profile, payment setup
  template/        # Template detail
components/        # Shared UI
context/           # Auth, Quote, Profile, Theme providers
data/
  templates.ts     # Job templates + cost calculator
lib/
  supabase.ts      # Supabase client
  upload-photo.ts  # Storage uploads
  notification.ts  # Push notification setup
public-quote-page/ # Static client-facing quote + Stripe deposit pages
```

---

## Core flows

### Create a quote

1. Tap **New Quote** (dashboard or FAB menu)
2. Add job photos and optional description → **Suggest Template & Continue**
3. Accept or skip the template suggestion
4. Set job name, pick or type a client, edit line items, add notes
5. **Save Quote** (persists to Supabase) or **Generate PDF** (share sheet)

### Share with a client

- Share the PDF directly, or send a link to the public quote page (`public-quote-page` + edge function) so they can review and pay a deposit.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Open iOS simulator |
| `npm run android` | Open Android emulator |
| `npm run web` | Run in browser |
| `npm run lint` | Run ESLint |

---

## Notes

- Auth uses Supabase email/password. Confirm email is enabled by default in Supabase; adjust in the dashboard if you want instant sign-in for development.
- The public quote page lives under `public-quote-page/` and is designed to be hosted separately (e.g. Vercel). Point it at your Supabase edge functions.
- Job templates in `data/templates.ts` are a strong starting point for South Florida / US residential work; tune rates and materials for your market.

---

## License

Private project. All rights reserved.
