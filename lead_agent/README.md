# Lead Discovery Agent Backend

Python backend that finds engineering/hiring contacts for a company and serves both CLI + FastAPI endpoints.

## What It Does
- Extracts root company domain from website URL.
- Discovers relevant LinkedIn profiles using SerpAPI (keyword + company matching).
- Looks up Hunter domain emails.
- Uses dominant Hunter pattern to infer missing emails.
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
        "source": "hunter_exact | hunter_pattern | pattern_fallback",
        "reference_email": "",
        "pattern": "first.last | flast | first | unknown"
      }
    }
  ],
  "warning": "",
  "error": ""
}
```

## Notes
- `email_confidence="high"` means direct Hunter match.
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
