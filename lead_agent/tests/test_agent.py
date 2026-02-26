from __future__ import annotations

import pytest

import agent


def test_pattern_for_record() -> None:
    assert (
        agent._pattern_for_record(  # noqa: SLF001
            {
                "value": "alice.smith@example.com",
                "first_name": "Alice",
                "last_name": "Smith",
            }
        )
        == "first.last"
    )
    assert (
        agent._pattern_for_record(  # noqa: SLF001
            {
                "value": "asmith@example.com",
                "first_name": "Alice",
                "last_name": "Smith",
            }
        )
        == "flast"
    )
    assert (
        agent._pattern_for_record(  # noqa: SLF001
            {
                "value": "alice@example.com",
                "first_name": "Alice",
                "last_name": "Smith",
            }
        )
        == "first"
    )


def test_dominant_hunter_pattern() -> None:
    records = [
        {"value": "a.one@example.com", "first_name": "A", "last_name": "One"},
        {"value": "b.two@example.com", "first_name": "B", "last_name": "Two"},
        {"value": "cthree@example.com", "first_name": "C", "last_name": "Three"},
    ]
    pattern, example = agent._dominant_hunter_pattern(records)  # noqa: SLF001
    assert pattern == "first.last"
    assert example and example["value"] == "a.one@example.com"


def test_find_relevant_contacts_priority_and_dedup(monkeypatch: pytest.MonkeyPatch) -> None:
    candidates = [
        {"name": "Alice Smith", "title": "Software Engineer", "linkedin": "https://linkedin.com/in/alice"},
        {"name": "Alice Smith", "title": "Software Engineer", "linkedin": "https://linkedin.com/in/alice"},
        {"name": "Bob Jones", "title": "Engineering Manager", "linkedin": "https://linkedin.com/in/bob"},
        {"name": "", "title": "Recruiter", "linkedin": "https://linkedin.com/in/unknown"},
    ]
    hunter = [
        {
            "first_name": "Alice",
            "last_name": "Smith",
            "value": "alice.smith@acme.com",
            "confidence": 95,
        },
        {
            "first_name": "Pattern",
            "last_name": "User",
            "value": "pattern.user@acme.com",
            "confidence": 60,
        },
    ]

    monkeypatch.setenv("APOLLO_API_KEY", "apollo-key")
    monkeypatch.setattr(agent, "find_linkedin_people", lambda *args, **kwargs: candidates)
    monkeypatch.setattr(agent, "hunter_domain_search", lambda *args, **kwargs: hunter)
    monkeypatch.setattr(agent, "infer_email", lambda name, domain: [])  # noqa: ARG005
    monkeypatch.setattr(
        agent,
        "apollo_enrich_person",
        lambda first, last, domain: {"person": {"email": "alice.apollo@acme.com", "email_status": "verified"}}
        if first == "alice"
        else {},
    )
    monkeypatch.setattr(agent, "apollo_extract_email", lambda payload: payload.get("person", {}).get("email", ""))
    monkeypatch.setattr(agent, "apollo_status", lambda payload: payload.get("person", {}).get("email_status", "apollo"))

    contacts = agent.find_relevant_contacts("Acme", "acme.com")
    assert len(contacts) == 3

    alice = next(c for c in contacts if c["linkedin"].endswith("/alice"))
    bob = next(c for c in contacts if c["linkedin"].endswith("/bob"))
    unknown = next(c for c in contacts if c["linkedin"].endswith("/unknown"))

    assert alice["email"] == "alice.apollo@acme.com"
    assert alice["email_confidence"] == "high"
    assert alice["email_reference"]["source"] == "apollo_exact"

    assert bob["email"] == "bob.jones@acme.com"
    assert bob["email_confidence"] == "inferred"
    assert bob["email_reference"]["source"] == "hunter_pattern"

    assert unknown["email"] == ""
    assert unknown["email_confidence"] == "unknown"


def test_find_relevant_contacts_skips_apollo_when_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    candidates = [
        {"name": "Alice Smith", "title": "Software Engineer", "linkedin": "https://linkedin.com/in/alice"},
    ]
    hunter = [
        {
            "first_name": "Alice",
            "last_name": "Smith",
            "value": "alice.smith@acme.com",
            "confidence": 95,
        }
    ]

    monkeypatch.delenv("APOLLO_API_KEY", raising=False)
    monkeypatch.setattr(agent, "find_linkedin_people", lambda *args, **kwargs: candidates)
    monkeypatch.setattr(agent, "hunter_domain_search", lambda *args, **kwargs: hunter)
    monkeypatch.setattr(agent, "infer_email", lambda name, domain: [])  # noqa: ARG005

    def should_not_run(*args, **kwargs):  # noqa: ANN002, ANN003
        raise AssertionError("Apollo should not be called when APOLLO_API_KEY is missing")

    monkeypatch.setattr(agent, "apollo_enrich_person", should_not_run)

    contacts = agent.find_relevant_contacts("Acme", "acme.com")
    assert len(contacts) == 1
    assert contacts[0]["email"] == "alice.smith@acme.com"
    assert contacts[0]["email_reference"]["source"] == "hunter_exact"


def test_find_relevant_contacts_apollo_cap(monkeypatch: pytest.MonkeyPatch) -> None:
    candidates = [
        {
            "name": f"Person{i} Last{i}",
            "title": "Software Engineer",
            "linkedin": f"https://linkedin.com/in/person{i}",
        }
        for i in range(45)
    ]
    calls = {"count": 0}

    def fake_apollo(first: str, last: str, domain: str) -> dict:  # noqa: ARG001
        calls["count"] += 1
        return {}

    monkeypatch.setenv("APOLLO_API_KEY", "apollo-key")
    monkeypatch.setattr(agent, "find_linkedin_people", lambda *args, **kwargs: candidates)
    monkeypatch.setattr(agent, "hunter_domain_search", lambda *args, **kwargs: [])
    monkeypatch.setattr(agent, "infer_email", lambda name, domain: [])
    monkeypatch.setattr(agent, "apollo_enrich_person", fake_apollo)
    monkeypatch.setattr(agent, "apollo_extract_email", lambda payload: "")
    monkeypatch.setattr(agent, "apollo_status", lambda payload: "apollo")

    contacts = agent.find_relevant_contacts("Acme", "acme.com")
    assert len(contacts) == 45
    assert calls["count"] == agent.APOLLO_CONTACT_CAP


def test_build_contact_records_warning_when_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent, "get_company_metadata", lambda *args, **kwargs: {"company_logo": "", "industry": "X", "location": "Y"})
    monkeypatch.setattr(agent, "find_relevant_contacts", lambda *args, **kwargs: [])

    result = agent.build_contact_records(
        company_name="Acme",
        website_url="https://acme.com",
        domain="acme.com",
        linkedin_url="https://linkedin.com/company/acme",
    )

    assert result["contacts"] == []
    assert "warning" in result


def test_run_agent_success(monkeypatch: pytest.MonkeyPatch) -> None:
    import utils as utils_module

    monkeypatch.setattr(utils_module, "extract_domain", lambda _: "acme.com")
    monkeypatch.setattr(agent, "build_contact_records", lambda *args, **kwargs: {"ok": True})

    result = agent.run_agent("https://acme.com", "https://linkedin.com/company/acme")
    assert result == {"ok": True}


def test_run_agent_missing_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    import utils as utils_module

    monkeypatch.setattr(utils_module, "extract_domain", lambda _: "")
    result = agent.run_agent("not a domain", "https://linkedin.com/company/acme")
    assert result["error"] == "Could not extract domain from website URL"


def test_run_agent_value_error(monkeypatch: pytest.MonkeyPatch) -> None:
    import utils as utils_module

    monkeypatch.setattr(utils_module, "extract_domain", lambda _: "acme.com")

    def blow_up(*args, **kwargs):  # noqa: ANN002, ANN003
        raise ValueError("Missing SERPAPI_KEY")

    monkeypatch.setattr(agent, "build_contact_records", blow_up)
    result = agent.run_agent("https://acme.com", "https://linkedin.com/company/acme")
    assert result["error"] == "Missing SERPAPI_KEY"


def test_run_agent_generic_error(monkeypatch: pytest.MonkeyPatch) -> None:
    import utils as utils_module

    monkeypatch.setattr(utils_module, "extract_domain", lambda _: "acme.com")

    def blow_up(*args, **kwargs):  # noqa: ANN002, ANN003
        raise RuntimeError("unexpected failure")

    monkeypatch.setattr(agent, "build_contact_records", blow_up)
    result = agent.run_agent("https://acme.com", "https://linkedin.com/company/acme")
    assert result["error"] == "Agent failure: unexpected failure"
