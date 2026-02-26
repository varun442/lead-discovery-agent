# WarmReach Backend

Python backend that finds engineering/hiring contacts for a company and serves both CLI + FastAPI endpoints.

## What It Does
- Extracts root company domain from website URL.
- Discovers relevant LinkedIn profiles using SerpAPI (keyword + company matching).
- Uses Apollo per-contact enrichment as primary (top 40 deduped candidates).
- Falls back to Hunter domain emails when Apollo returns no email.
- Uses dominant Hunter pattern and then local inference for remaining misses.
- Returns structured JSON with confidence labels and email references.

## Tech
- Python 3.10+
- `requests`
- `python-dotenv`
- `fastapi`
- `uvicorn`

## Project Structure
- `/Users/varunsavai/Documents/New project/lead_agent/main.py` CLI entry
- `/Users/varunsavai/Documents/New project/lead_agent/api_server.py` FastAPI app
- `/Users/varunsavai/Documents/New project/lead_agent/agent.py` orchestration logic
- `/Users/varunsavai/Documents/New project/lead_agent/utils.py` integrations + helpers

## Setup
```bash
cd "/Users/varunsavai/Documents/New project/lead_agent"
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
```

Configure `/Users/varunsavai/Documents/New project/lead_agent/.env`:
```env
SERPAPI_KEY=your_serpapi_key
APOLLO_API_KEY=your_apollo_api_key
HUNTER_API_KEY=your_hunter_api_key
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Run (CLI)
```bash
cd "/Users/varunsavai/Documents/New project/lead_agent"
source .venv/bin/activate
python3 main.py --website "https://stripe.com" --linkedin "https://linkedin.com/company/stripe"
```

With quieter output:
```bash
python3 main.py --website "https://stripe.com" --linkedin "https://linkedin.com/company/stripe" --quiet
```

## Run (API)
```bash
cd "/Users/varunsavai/Documents/New project/lead_agent"
source .venv/bin/activate
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

## Run Unit Tests
```bash
cd "/Users/varunsavai/Documents/New project/lead_agent"
source .venv/bin/activate
pytest -q
```

## API Endpoints
- `GET /health`
- `POST /api/leads`
- `GET /api/leads/stream?website=...&linkedin=...` (SSE progress + result)

Example POST body:
```json
{
  "website": "https://stripe.com",
  "linkedin": "https://linkedin.com/company/stripe"
}
```

## Response Shape
```json
{
  "company": "Stripe",
  "website": "https://stripe.com",
  "email_domain": "stripe.com",
  "linkedin_company": "https://linkedin.com/company/stripe",
  "company_logo": "",
  "industry": "",
  "location": "",
  "contacts": [
    {
      "name": "Jane Doe",
      "title": "Engineering Manager ...",
      "linkedin": "https://www.linkedin.com/in/....",
      "email": "jane.doe@stripe.com",
      "email_confidence": "high | inferred | unknown",
      "email_reference": {
        "source": "apollo_exact | hunter_exact | hunter_pattern | pattern_fallback",
        "reference_email": "",
        "pattern": "apollo_status | first.last | flast | first | unknown"
      }
    }
  ],
  "warning": "",
  "error": ""
}
```

## Notes
- Resolution order is: `Apollo -> Hunter -> pattern inference`.
- Apollo is attempted for top 40 deduped contacts per run to control cost/latency.
- `email_confidence="high"` means direct Apollo/Hunter match.
- `email_confidence="inferred"` means pattern-based inference.
- If SerpAPI/Hunter fails, API returns partial structured output with `error`/`warning`.

## Quick Troubleshooting
- `All SerpAPI employee-search queries failed`:
  - verify `SERPAPI_KEY`
  - check SerpAPI credits
- `Missing HUNTER_API_KEY` / `Missing SERPAPI_KEY`:
  - ensure `.env` exists in backend folder
- Empty contacts:
  - try another company and verify LinkedIn company URL/domain precision.
