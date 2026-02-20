from __future__ import annotations

import json
import os
import queue
import threading
from collections.abc import Generator

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from dotenv import load_dotenv
from starlette.responses import StreamingResponse

from agent import run_agent

load_dotenv(override=True)

app = FastAPI(title="WarmReach API", version="1.0.0")

origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LeadRequest(BaseModel):
    website: HttpUrl
    linkedin: HttpUrl


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/leads")
def discover_leads(payload: LeadRequest) -> dict:
    return run_agent(str(payload.website), str(payload.linkedin))


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _stream_agent(website: str, linkedin: str) -> Generator[str, None, None]:
    updates: queue.Queue[dict] = queue.Queue()
    done = threading.Event()
    result_holder: dict[str, dict] = {}
    error_holder: dict[str, str] = {}

    def progress(message: str) -> None:
        updates.put({"message": message})

    def run() -> None:
        try:
            result_holder["result"] = run_agent(website, linkedin, progress=progress)
        except Exception as exc:  # pragma: no cover - defensive path
            error_holder["error"] = str(exc)
        finally:
            done.set()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    yield _sse_event("progress", {"message": "Request accepted"})

    while not done.is_set() or not updates.empty():
        try:
            item = updates.get(timeout=0.5)
            yield _sse_event("progress", item)
        except queue.Empty:
            continue

    if "error" in error_holder:
        yield _sse_event("error", {"message": error_holder["error"]})
    else:
        yield _sse_event("result", result_holder["result"])


@app.get("/api/leads/stream")
def stream_leads(
    website: str = Query(..., description="Company website URL"),
    linkedin: str = Query(..., description="LinkedIn company URL"),
) -> StreamingResponse:
    generator = _stream_agent(website, linkedin)
    return StreamingResponse(generator, media_type="text/event-stream")
