# Production Deployment (Vercel + Render/Railway)

## Architecture
- Frontend: Next.js app at `lead_agent_ui`
- Backend: FastAPI app at `lead_agent`

## 1) Deploy backend (Render/Railway)

Use root directory: `lead_agent`

Build command:
```bash
pip install -r requirements.txt
```

Start command:
```bash
uvicorn api_server:app --host 0.0.0.0 --port $PORT
```

Environment variables:
- `SERPAPI_KEY`
- `HUNTER_API_KEY`
- `FRONTEND_ORIGINS=https://your-frontend-domain.vercel.app`

Health check path:
- `/health`

## 2) Deploy frontend (Vercel)

Use root directory: `lead_agent_ui`

Environment variable:
- `NEXT_PUBLIC_LEAD_API_URL=https://your-backend-domain.com`

## 3) Verify integration
1. Open frontend URL.
2. Submit website + LinkedIn company URL.
3. Confirm contacts render from live backend response.
4. Check backend logs for `POST /api/leads` entries.

## 4) Security basics
- Keep API keys only on backend.
- Rotate keys if exposed.
- Restrict `FRONTEND_ORIGINS` to trusted frontend domains.

## 5) GitHub merge safety (recommended)
Enable branch protection on `main` so CI must pass before merge:
- `/Users/varunsavai/Documents/New project/docs/github-branch-protection.md`
