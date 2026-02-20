import os
import re
from typing import Callable
from urllib.parse import urlparse

import requests

SERPAPI_URL = "https://serpapi.com/search"
HUNTER_DOMAIN_SEARCH_URL = "https://api.hunter.io/v2/domain-search"


TITLE_KEYWORDS = [
    "software",
    "engineer",
    "developer",
    "engineering",
    "tech",
    "recruiter",
    "hiring",
    "talent",
    "manager",
    "director",
]

ProgressFn = Callable[[str], None] | None


def extract_domain(website_url: str) -> str:
    """Extract root domain from a URL.

    Example:
    https://www.ncrvoyix.com -> ncrvoyix.com
    """
    if not website_url:
        return ""

    raw = website_url.strip()
    if not raw.startswith(("http://", "https://")):
        raw = f"https://{raw}"

    parsed = urlparse(raw)
    host = parsed.netloc.lower().strip()

    if host.startswith("www."):
        host = host[4:]

    labels = host.split(".")
    if len(labels) >= 2 and all(labels):
        # Heuristic root extraction without external dependencies.
        # Example: careers.company.com -> company.com
        return ".".join(labels[-2:])

    return host


def _extract_company_slug_from_linkedin(linkedin_url: str) -> str:
    if not linkedin_url:
        return ""
    raw = linkedin_url.strip().rstrip("/")
    parsed = urlparse(raw if raw.startswith(("http://", "https://")) else f"https://{raw}")
    path = parsed.path.strip("/")
    parts = path.split("/") if path else []

    # Expected: /company/<slug>
    if len(parts) >= 2 and parts[0].lower() == "company":
        return parts[1]
    return ""


def serp_search(query: str) -> dict:
    """Run a SerpAPI Google search and return parsed JSON."""
    api_key = os.getenv("SERPAPI_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing SERPAPI_KEY")

    try:
        response = requests.get(
            SERPAPI_URL,
            params={
                "engine": "google",
                "q": query,
                "api_key": api_key,
                "num": 20,
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("error"):
            raise RuntimeError(f"SerpAPI error: {payload.get('error')}")
        return payload
    except requests.RequestException as exc:
        raise RuntimeError(f"SerpAPI request failed: {exc}") from exc


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9\s]+", " ", (value or "").lower()).strip()


def _extract_domain_root(domain: str) -> str:
    if not domain:
        return ""
    return domain.split(".")[0].replace("-", " ").strip().lower()


def _phrase_in_text(phrase: str, text: str) -> bool:
    if not phrase:
        return False
    pattern = re.compile(r"\b" + re.escape(phrase) + r"\b")
    for match in pattern.finditer(text):
        # Ignore explicitly negated mentions (e.g., "not greenhouse software").
        prefix = text[max(0, match.start() - 64) : match.start()]
        if re.search(r"\b(not|no|without|except)\s+(?:\w+\s+){0,3}$", prefix):
            continue
        return True
    return False


def _sanitize_location(value: str) -> str:
    candidate = (value or "").strip()
    if not candidate:
        return "Location unavailable"

    candidate = re.sub(r"\s+", " ", candidate)
    candidate = re.sub(r"\b(location|headquarters)\s*:\s*", "", candidate, flags=re.IGNORECASE)
    candidate = re.split(r"https?://|www\.", candidate)[0]
    candidate = re.split(r"\.\.\.|…", candidate)[0]
    candidate = re.split(r"\s[-|·]\s", candidate)[0]
    candidate = candidate.strip(" ,;:-")

    if not candidate:
        return "Location unavailable"

    # Filter obvious non-location noise that sometimes appears in snippets.
    if re.search(r"\b(about|experience|connections|followers|linkedin|profile|hiring)\b", candidate, flags=re.IGNORECASE):
        return "Location unavailable"

    return candidate


def _alias_variants(alias: str) -> set[str]:
    normalized = _normalize_text(alias)
    if not normalized:
        return set()

    variants = {normalized}
    compact = normalized.replace(" ", "")

    # Handle compact brand strings such as "juullabs" -> "juul labs".
    suffixes = [
        "labs",
        "lab",
        "tech",
        "technology",
        "technologies",
        "systems",
        "software",
        "solutions",
        "group",
        "inc",
        "llc",
        "corp",
        "corporation",
    ]
    for suffix in suffixes:
        if compact.endswith(suffix) and len(compact) > len(suffix):
            head = compact[: -len(suffix)].strip()
            if len(head) >= 3:
                variants.add(f"{head} {suffix}".strip())

    return {value for value in variants if value}


def _company_match_score(
    *,
    title: str,
    snippet: str,
    company_name: str,
    keywords: list[str],
    linkedin_company_url: str = "",
    domain: str = "",
) -> int:
    text = _normalize_text(f"{title} {snippet}")
    score = 0

    keyword_hit = any(k in text for k in keywords)
    if keyword_hit:
        score += 1

    slug = _extract_company_slug_from_linkedin(linkedin_company_url).replace("-", " ").strip().lower()
    company_phrase = _normalize_text(company_name)
    domain_root = _extract_domain_root(domain)

    strong_aliases = list(dict.fromkeys(alias for alias in [slug, company_phrase, domain_root] if alias))

    for alias in strong_aliases:
        best_alias_score = 0
        for variant in _alias_variants(alias):
            alias_tokens = variant.split()
            if len(alias_tokens) >= 2 and _phrase_in_text(variant, text):
                # Multi-word company alias match is a strong signal.
                best_alias_score = max(best_alias_score, 3)
            elif len(alias_tokens) == 1:
                # Single-token company names are noisy (e.g., "Greenhouse").
                # Require an employment cue such as "at greenhouse".
                if re.search(rf"\b(at|@|from)\s+{re.escape(variant)}\b", text):
                    best_alias_score = max(best_alias_score, 2)
        score += best_alias_score

    return score


def find_linkedin_people(
    company_name: str,
    keywords: list[str],
    progress: ProgressFn = None,
    linkedin_company_url: str = "",
    domain: str = "",
) -> list[dict]:
    """Find LinkedIn profile candidates via Google site search through SerpAPI."""
    found: list[dict] = []
    seen = set()
    failed_queries = 0
    total_queries = 0

    def has_keyword(text: str) -> bool:
        low = (text or "").lower()
        return any(k in low for k in keywords)

    queries = [f'site:linkedin.com/in "{company_name}" "{keyword}"' for keyword in keywords]
    # Fallback broad query in case per-keyword queries are too strict.
    queries.append(f'site:linkedin.com/in "{company_name}"')
    if progress:
        progress(f"Searching LinkedIn profiles via SerpAPI with {len(queries)} queries")

    for query in queries:
        total_queries += 1
        if progress:
            progress(f"SerpAPI query {total_queries}/{len(queries)}")
        try:
            results = serp_search(query)
        except Exception:
            failed_queries += 1
            if progress:
                progress(f"Query failed: {query}")
            continue

        added_before = len(found)
        for item in results.get("organic_results", []):
            link = (item.get("link") or "").strip()
            title = (item.get("title") or "").strip()
            snippet = (item.get("snippet") or "").strip()

            if not link or "linkedin.com/in/" not in link:
                continue
            if link in seen:
                continue
            if not has_keyword(f"{title} {snippet}"):
                continue

            score = _company_match_score(
                title=title,
                snippet=snippet,
                company_name=company_name,
                keywords=keywords,
                linkedin_company_url=linkedin_company_url,
                domain=domain,
            )
            # Require stronger evidence that profile belongs to the target company.
            if score < 2:
                continue
            seen.add(link)

            # Naive name extraction from SERP title prefix.
            name = title.split(" - ")[0].split("| ")[0].strip()
            found.append(
                {
                    "name": name,
                    "title": snippet,
                    "linkedin": link,
                    "source_keyword": query,
                    "match_score": score,
                }
            )
        added_after = len(found)
        if progress:
            progress(f"Query returned {added_after - added_before} new matching profiles")

    if not found and failed_queries == total_queries and total_queries > 0:
        raise RuntimeError("All SerpAPI employee-search queries failed")

    return found


def hunter_domain_search(domain: str, progress: ProgressFn = None) -> list[dict]:
    """Fetch known emails from Hunter for a company domain."""
    api_key = os.getenv("HUNTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing HUNTER_API_KEY")

    try:
        if progress:
            progress(f"Calling Hunter domain-search for {domain}")
        response = requests.get(
            HUNTER_DOMAIN_SEARCH_URL,
            params={"domain": domain, "api_key": api_key, "limit": 100},
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json().get("data", {})
        emails = payload.get("emails", []) or []
        if progress:
            progress(f"Hunter returned {len(emails)} email records")
        return emails
    except requests.RequestException as exc:
        raise RuntimeError(f"Hunter domain search failed: {exc}") from exc


def infer_email(name: str, domain: str) -> list[str]:
    """Generate likely company email patterns from a person's name."""
    if not name or not domain:
        return []

    cleaned = re.sub(r"[^a-zA-Z\s]", "", name).strip().lower()
    parts = [p for p in cleaned.split() if p]

    if not parts:
        return []

    first = parts[0]
    last = parts[-1] if len(parts) > 1 else ""

    possibilities = []

    if first and last:
        possibilities.append(f"{first}.{last}@{domain}")
        possibilities.append(f"{first[0]}{last}@{domain}")

    if first:
        possibilities.append(f"{first}@{domain}")

    # Deduplicate while preserving order.
    unique = []
    seen = set()
    for email in possibilities:
        if email not in seen:
            unique.append(email)
            seen.add(email)

    return unique


def extract_company_name_from_linkedin_url(linkedin_url: str) -> str:
    """Turn LinkedIn company slug into a human-readable name if possible."""
    slug = _extract_company_slug_from_linkedin(linkedin_url)
    if not slug:
        return ""
    return slug.replace("-", " ").strip().title()


def get_company_metadata(company_name: str, linkedin_url: str, domain: str) -> dict:
    """Best-effort company metadata enrichment from SerpAPI knowledge graph."""
    logo_url = f"https://www.google.com/s2/favicons?domain={domain}&sz=128" if domain else ""
    metadata = {
        "company_logo": logo_url,
        "industry": "Industry unavailable",
        "location": "Location unavailable",
    }

    # Use LinkedIn URL when available to increase precision.
    query = linkedin_url.strip() or company_name.strip()
    if not query:
        return metadata

    try:
        payload = serp_search(query)
    except Exception:
        return metadata

    kg = payload.get("knowledge_graph", {}) or {}
    for key in ["type", "industry"]:
        value = kg.get(key)
        if isinstance(value, str) and value.strip():
            metadata["industry"] = value.strip()
            break

    for key in ["headquarters", "location"]:
        value = kg.get(key)
        if isinstance(value, str) and value.strip():
            cleaned = _sanitize_location(value)
            if cleaned != "Location unavailable":
                metadata["location"] = cleaned
                break

    # Fallback parse from search snippets when KG is incomplete.
    if metadata["industry"] == "Industry unavailable" or metadata["location"] == "Location unavailable":
        snippets = [
            (item.get("snippet") or "").strip()
            for item in payload.get("organic_results", [])
            if isinstance(item, dict)
        ]
        combined = " ".join(snippets).lower()

        if metadata["industry"] == "Industry unavailable":
            m = re.search(r"industry[:\s]+([a-z][a-z0-9\s&/-]{3,60})", combined)
            if m:
                metadata["industry"] = m.group(1).strip().title()

        if metadata["location"] == "Location unavailable":
            m = re.search(r"(headquarters|location)[:\s]+([a-z][a-z0-9\s,.-]{3,120})", combined, flags=re.IGNORECASE)
            if m:
                metadata["location"] = _sanitize_location(m.group(2))

    return metadata
