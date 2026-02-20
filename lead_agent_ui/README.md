# Lead Agent UI (Next.js + TypeScript)

Frontend for the Lead Discovery Agent with Supabase auth, profile/resume management, AI email drafting, and credit usage controls.

## Stack
- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Supabase Auth (`@supabase/ssr`)
- OpenAI Responses API (server-side route)

## Current Product Flow
1. User signs in (email/password or Google via Supabase).
2. User discovers leads (backend FastAPI + SSE progress).
3. User uploads resume in profile.
4. User sets Job Description context.
5. User clicks `Send AI Email` on a lead:
   - draft is generated
   - preview dialog opens
   - user confirms send
   - Gmail compose opens with prefilled subject/body

## Important Behavior
- Emails are masked by default and unlock per-contact through app flow.
- State is persisted **per authenticated user** (so users do not see each other’s last search in shared browser).
- Draft generation uses base-draft caching (`JD + resume + tone`) for cost/performance.
- Credits are charged per generated draft action.

## Local Setup
```bash
cd "/Users/varunsavai/Documents/New project/lead_agent_ui"
cp .env.local.example .env.local
npm install
npm run dev
```

For polling HMR:
```bash
npm run dev:hmr
```

Open: [http://localhost:3000](http://localhost:3000)

## Run Unit Tests
```bash
cd "/Users/varunsavai/Documents/New project/lead_agent_ui"
npm install
npm run test:run
```

## Environment
Set `/Users/varunsavai/Documents/New project/lead_agent_ui/.env.local`:
```env
NEXT_PUBLIC_LEAD_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=sk-your-server-side-key
OPENAI_MODEL=gpt-4.1-mini
DRAFTS_DAILY_LIMIT=10
```

## Supabase SQL Setup (Required)
Run in this order in Supabase SQL Editor:
1. `/Users/varunsavai/Documents/New project/lead_agent_ui/docs/supabase_outreach_drafts.sql`
2. `/Users/varunsavai/Documents/New project/lead_agent_ui/docs/supabase_outreach_base_drafts.sql`
3. `/Users/varunsavai/Documents/New project/lead_agent_ui/docs/supabase_credits.sql`
4. `/Users/varunsavai/Documents/New project/lead_agent_ui/docs/supabase_company_searches.sql`

## Frontend Routes
- `/` landing page
- `/dashboard` lead discovery + outreach workflow
- `/sign-in` auth screen
- `/profile` resume upload/view

## API Routes (Next.js)
- `POST /api/outreach/draft`
  - generates draft using cached base template + personalization
  - returns request id for debugging
  - charges credits
- `GET /api/outreach/quota`
  - returns credit balance and daily limits/usage
- `GET /api/company-search-history?limit=15`
  - returns prior company searches for current user
- `POST /api/company-search-history`
  - upserts search history per user + domain
- `DELETE /api/company-search-history?id=<uuid>`
  - deletes one history item for current user
- `DELETE /api/company-search-history?all=true`
  - clears all history items for current user

## Backend Dependency
This UI expects backend API running at `NEXT_PUBLIC_LEAD_API_URL`:
- `GET /api/leads/stream`
- `POST /api/leads`
- `GET /health`

See backend README:
- `/Users/varunsavai/Documents/New project/lead_agent/README.md`

## Debugging
If draft generation fails:
1. Check UI error panel (includes request id).
2. Check Next.js terminal logs for `outreach:draft:<request_id>`.
3. Check Supabase logs:
```sql
select created_at, status, error_message, contact_email
from public.outreach_drafts
order by created_at desc
limit 50;
```

Check base-draft cache usage:
```sql
select created_at, user_id, jd_hash, resume_hash, tone
from public.outreach_base_drafts
order by created_at desc
limit 50;
```

Check wallet balance + transactions:
```sql
select * from public.user_credit_wallets order by updated_at desc;
select * from public.credit_transactions order by created_at desc limit 100;
```

## Security Notes
- Keep `OPENAI_API_KEY` server-side only.
- Never expose service-role keys in frontend.
- Rotate any key that was shared publicly.
