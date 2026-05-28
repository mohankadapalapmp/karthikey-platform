# Karthikey AI Agent Platform — Deployment Guide
## Deploy to production on Vercel in ~45 minutes

---

## STEP 1 — Set up Supabase (10 min)

1. Go to https://supabase.com → Create new project
   - Name: karthikey-platform
   - Region: ap-south-1 (Mumbai — closest to India)
   - Save your database password

2. Go to Project Settings → API
   - Copy: Project URL → NEXT_PUBLIC_SUPABASE_URL
   - Copy: anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Copy: service_role key → SUPABASE_SERVICE_ROLE_KEY

3. Go to SQL Editor → New query
   - Paste the entire contents of supabase_schema.sql
   - Click Run

4. Go to Authentication → Providers
   - Enable Email (already on by default)
   - Enable Google: add your Google OAuth credentials
     (create at https://console.cloud.google.com → APIs & Services → Credentials)

---

## STEP 2 — Get Anthropic API key (2 min)

1. Go to https://console.anthropic.com
2. API Keys → Create key
3. Copy → ANTHROPIC_API_KEY

---

## STEP 3 — Set up Razorpay (10 min)

1. Go to https://dashboard.razorpay.com → Sign up
2. Settings → API Keys → Generate test key
   - Copy Key ID → RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID
   - Copy Key Secret → RAZORPAY_KEY_SECRET

3. Settings → Webhooks → Add new webhook
   - URL: https://YOUR-APP.vercel.app/api/razorpay/webhook
   - Secret: create a random string → RAZORPAY_WEBHOOK_SECRET
   - Events: select "payment.captured"

---

## STEP 4 — Push to GitHub (3 min)

1. Create a new repo on https://github.com (e.g. karthikey-platform)

2. In your terminal:
   cd /path/to/karthikey
   git init
   git add .
   git commit -m "Initial commit — Karthikey AI platform"
   git remote add origin https://github.com/YOUR_USERNAME/karthikey-platform.git
   git push -u origin main

---

## STEP 5 — Deploy on Vercel (5 min)

1. Go to https://vercel.com → New project
2. Import your GitHub repo
3. Framework: Next.js (auto-detected)
4. Add all environment variables (Settings → Environment Variables):

   NEXT_PUBLIC_SUPABASE_URL          = (from step 1)
   NEXT_PUBLIC_SUPABASE_ANON_KEY     = (from step 1)
   SUPABASE_SERVICE_ROLE_KEY         = (from step 1)
   ANTHROPIC_API_KEY                 = (from step 2)
   RAZORPAY_KEY_ID                   = (from step 3)
   RAZORPAY_KEY_SECRET               = (from step 3)
   NEXT_PUBLIC_RAZORPAY_KEY_ID       = (from step 3 — same as KEY_ID)
   RAZORPAY_WEBHOOK_SECRET           = (from step 3)
   NEXT_PUBLIC_APP_URL               = https://your-app.vercel.app

5. Click Deploy → wait ~2 minutes

---

## STEP 6 — Connect your domain (5 min)

1. In Vercel → Project → Settings → Domains
2. Add domain: agents.karthikey.in (or karthikey.in)
3. Add the CNAME record in your DNS provider:
   CNAME: agents → cname.vercel-dns.com

4. Update NEXT_PUBLIC_APP_URL in Vercel env vars to your real domain
5. Update Razorpay webhook URL to your real domain

---

## STEP 7 — Go live checklist

□ Sign up on your own platform — confirm 5 free credits appear
□ Upload a sample Excel file — confirm parsing works
□ Run "Lead Qualifier" — confirm Claude responds
□ Check Supabase → usage_log table — confirm row logged
□ Make a test payment (Razorpay test mode: card 4111 1111 1111 1111)
□ Confirm credits topped up in Supabase → accounts table
□ Switch Razorpay to live mode when ready

---

## Production to-do list (after go-live)

- [ ] Add Google Analytics / Posthog for user tracking
- [ ] Set up error monitoring (Sentry)
- [ ] Add rate limiting on /api/agent (1 req/sec per user)
- [ ] Enable Supabase daily backups
- [ ] Add WhatsApp output delivery (Twilio / WATI)
- [ ] Build Zoho CRM connector (Phase 2)
- [ ] Add team accounts with shared credit pools

---

## File structure

karthikey/
├── app/
│   ├── page.js              ← Landing page
│   ├── login/page.js        ← Auth (login + signup)
│   ├── agents/
│   │   ├── page.js          ← Marketplace
│   │   └── [agentId]/page.js ← Agent runner
│   ├── dashboard/page.js    ← Usage dashboard
│   ├── credits/page.js      ← Buy credits (Razorpay)
│   └── api/
│       ├── agent/route.js          ← Claude proxy
│       ├── credits/route.js        ← Create Razorpay order
│       └── razorpay/webhook/route.js ← Payment webhook
├── components/
│   └── Topbar.js
├── lib/
│   ├── supabase.js
│   └── agents.js
├── supabase_schema.sql      ← Run in Supabase SQL editor
└── .env.local.example       ← Copy to .env.local with your keys

---

## Support
Email: marketing@karthikey.in
Platform: karthikey.in
