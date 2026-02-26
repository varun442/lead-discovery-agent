from __future__ import annotations

import os
from collections import Counter, defaultdict
from typing import Callable

from utils import (
    TITLE_KEYWORDS,
    apollo_enrich_person,
    apollo_extract_email,
    apollo_status,
    extract_company_name_from_linkedin_url,
    find_linkedin_people,
    get_company_metadata,
    hunter_domain_search,
    infer_email,
)

ProgressFn = Callable[[str], None] | None
APOLLO_CONTACT_CAP = 40


def get_company_name_from_domain(domain: str) -> str:
    """Convert a domain into a likely company name.

    Example: ncrvoyix.com -> Ncrvoyix
    """
    if not domain:
        return ""
    base = domain.split(".")[0]
    return base.replace("-", " ").strip().title()


def _normalize_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def _best_title(candidate: dict) -> str:
    # Serp snippets may be verbose; keep as-is for now.
    return (candidate.get("title") or "").strip()


def _name_parts(name: str) -> tuple[str, str]:
    tokens = [t for t in (name or "").strip().lower().split() if t]
    if not tokens:
        return "", ""
    return tokens[0], tokens[-1]


def _pattern_for_record(record: dict) -> str | None:
    email = (record.get("value") or "").strip().lower()
    first = (record.get("first_name") or "").strip().lower()
    last = (record.get("last_name") or "").strip().lower()
    if not email or not first or not last or "@" not in email:
        return None

    local = email.split("@", 1)[0]
    if local == f"{first}.{last}":
        return "first.last"
    if local == f"{first[0]}{last}":
        return "flast"
    if local == first:
        return "first"
    return None


def _build_email_from_pattern(first: str, last: str, domain: str, pattern: str) -> str:
    if not first or not domain:
        return ""
    if pattern == "first.last" and last:
        return f"{first}.{last}@{domain}"
    if pattern == "flast" and last:
        return f"{first[0]}{last}@{domain}"
    if pattern == "first":
        return f"{first}@{domain}"
    return ""


def _dominant_hunter_pattern(records: list[dict]) -> tuple[str | None, dict | None]:
    counts: Counter[str] = Counter()
    example_by_pattern: dict[str, dict] = {}

    for rec in records:
        pattern = _pattern_for_record(rec)
        if not pattern:
            continue
        counts[pattern] += 1
        if pattern not in example_by_pattern:
            example_by_pattern[pattern] = rec

    if not counts:
        return None, None

    dominant = counts.most_common(1)[0][0]
    return dominant, example_by_pattern.get(dominant)


def find_relevant_contacts(
    company_name: str,
    domain: str,
    linkedin_url: str = "",
    progress: ProgressFn = None,
) -> list[dict]:
    """Find employees and attach email candidates + confidence."""
    if progress:
        progress(f"Finding relevant people for company: {company_name}")
    candidates = find_linkedin_people(
        company_name,
        TITLE_KEYWORDS,
        progress=progress,
        linkedin_company_url=linkedin_url,
        domain=domain,
    )
    if progress:
        progress(f"Collected {len(candidates)} candidate profiles")

    apollo_enabled = bool(os.getenv("APOLLO_API_KEY", "").strip())
    if progress:
        if apollo_enabled:
            progress(f"Apollo primary enabled (cap: top {APOLLO_CONTACT_CAP} contacts)")
        else:
            progress("Apollo skipped due to missing key; using Hunter fallback")

    hunter_records = []
    try:
        hunter_records = hunter_domain_search(domain, progress=progress)
    except Exception:
        # Continue with inferred-only emails
        hunter_records = []
        if progress:
            progress("Hunter lookup failed or unavailable; using inference only")

    hunter_by_name: dict[str, list[dict]] = defaultdict(list)
    for rec in hunter_records:
        full_name = f"{rec.get('first_name', '')} {rec.get('last_name', '')}".strip()
        if full_name:
            hunter_by_name[_normalize_name(full_name)].append(rec)

    dominant_pattern, pattern_reference = _dominant_hunter_pattern(hunter_records)
    if progress and dominant_pattern:
        progress(f"Detected dominant Hunter email pattern: {dominant_pattern}")

    contacts: list[dict] = []
    seen_linkedin = set()
    stats = {
        "apollo_attempted": 0,
        "apollo_hits": 0,
        "hunter_fallback_attempted": 0,
        "hunter_fallback_hits": 0,
        "inference_hits": 0,
        "unknown_count": 0,
    }

    for person in candidates:
        linkedin = person.get("linkedin", "")
        if not linkedin or linkedin in seen_linkedin:
            continue
        seen_linkedin.add(linkedin)

        name = person.get("name", "").strip()
        title = _best_title(person)

        contact = {
            "name": name,
            "title": title,
            "linkedin": linkedin,
            "email": "",
            "email_confidence": "unknown",
            "email_reference": None,
        }

        dedup_rank = len(contacts) + 1
        first, last = _name_parts(name)
        should_try_apollo = apollo_enabled and dedup_rank <= APOLLO_CONTACT_CAP and bool(first and last)
        if should_try_apollo:
            stats["apollo_attempted"] += 1
            try:
                apollo_payload = apollo_enrich_person(first, last, domain)
            except Exception as exc:
                apollo_payload = {}
                if progress:
                    progress(f"Apollo enrich failed for {name or '(unknown)'}: {exc}")

            apollo_email = apollo_extract_email(apollo_payload)
            if apollo_email:
                contact["email"] = apollo_email
                contact["email_confidence"] = "high"
                contact["email_reference"] = {
                    "source": "apollo_exact",
                    "reference_email": apollo_email,
                    "pattern": apollo_status(apollo_payload),
                }
                stats["apollo_hits"] += 1

        if not contact["email"]:
            stats["hunter_fallback_attempted"] += 1
            matched = hunter_by_name.get(_normalize_name(name), [])
            if matched:
                # Prefer highest confidence score if available.
                matched_sorted = sorted(
                    matched,
                    key=lambda r: (r.get("confidence") is not None, r.get("confidence") or 0),
                    reverse=True,
                )
                picked = matched_sorted[0]
                if picked.get("value"):
                    contact["email"] = picked["value"]
                    contact["email_confidence"] = "high"
                    contact["email_reference"] = {
                        "source": "hunter_exact",
                        "reference_email": picked.get("value", ""),
                        "pattern": _pattern_for_record(picked),
                    }
                    stats["hunter_fallback_hits"] += 1

            if not contact["email"]:
                generated = _build_email_from_pattern(first, last, domain, dominant_pattern or "")
                if generated:
                    contact["email"] = generated
                    contact["email_confidence"] = "inferred"
                    contact["email_reference"] = {
                        "source": "hunter_pattern",
                        "reference_email": (pattern_reference or {}).get("value", ""),
                        "pattern": dominant_pattern,
                    }
                    stats["hunter_fallback_hits"] += 1
                else:
                    inferred = infer_email(name, domain)
                    if inferred:
                        contact["email"] = inferred[0]
                        contact["email_confidence"] = "inferred"
                        contact["email_reference"] = {
                            "source": "pattern_fallback",
                            "reference_email": "",
                            "pattern": "unknown",
                        }
                        stats["inference_hits"] += 1

        if not contact["email"]:
            stats["unknown_count"] += 1

        contacts.append(contact)

    if progress:
        progress(
            f"Apollo stats: attempted={stats['apollo_attempted']}, hits={stats['apollo_hits']}"
        )
        progress(
            "Hunter fallback stats: "
            f"attempted={stats['hunter_fallback_attempted']}, "
            f"hits={stats['hunter_fallback_hits']}"
        )
        progress(
            f"Inference stats: inferred={stats['inference_hits']}, unknown={stats['unknown_count']}"
        )
        progress(f"Built {len(contacts)} contact records")
    return contacts


def build_contact_records(
    company_name: str,
    website_url: str,
    domain: str,
    linkedin_url: str,
    progress: ProgressFn = None,
) -> dict:
    if progress:
        progress("Enriching company metadata")
    metadata = get_company_metadata(company_name, linkedin_url, domain)
    contacts = find_relevant_contacts(company_name, domain, linkedin_url=linkedin_url, progress=progress)
    result = {
        "company": company_name,
        "website": website_url,
        "email_domain": domain,
        "linkedin_company": linkedin_url,
        "company_logo": metadata.get("company_logo", ""),
        "industry": metadata.get("industry", "Industry unavailable"),
        "location": metadata.get("location", "Location unavailable"),
        "contacts": contacts,
    }
    if not contacts:
        result["warning"] = (
            "We couldn't confidently match LinkedIn profiles to this exact company. "
            "Try the official company website and LinkedIn company URL, then run again. "
            "If this still fails, try another company or verify your SerpAPI key and credits."
        )
    return result


def run_agent(website_url: str, linkedin_url: str, progress: ProgressFn = None) -> dict:
    from utils import extract_domain

    if progress:
        progress("Starting agent run")
    domain = extract_domain(website_url)
    if progress:
        progress(f"Extracted domain: {domain or '(empty)'}")

    linkedin_company_name = extract_company_name_from_linkedin_url(linkedin_url)
    domain_company_name = get_company_name_from_domain(domain)

    company_name = linkedin_company_name or domain_company_name
    if progress:
        progress(f"Resolved company name: {company_name or '(unknown)'}")

    if not domain:
        return {
            "company": company_name,
            "website": website_url,
            "email_domain": "",
            "linkedin_company": linkedin_url,
            "contacts": [],
            "error": "Could not extract domain from website URL",
        }

    try:
        result = build_contact_records(company_name, website_url, domain, linkedin_url, progress=progress)
        if progress:
            progress("Agent run completed")
        return result
    except ValueError as exc:
        # Typically missing API keys.
        return {
            "company": company_name,
            "website": website_url,
            "email_domain": domain,
            "linkedin_company": linkedin_url,
            "contacts": [],
            "error": str(exc),
        }
    except Exception as exc:
        # Return partial data while preserving schema.
        return {
            "company": company_name,
            "website": website_url,
            "email_domain": domain,
            "linkedin_company": linkedin_url,
            "contacts": [],
            "error": f"Agent failure: {exc}",
        }
