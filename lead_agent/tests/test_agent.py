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

    monkeypatch.setattr(agent, "find_linkedin_people", lambda *args, **kwargs: candidates)
    monkeypatch.setattr(agent, "hunter_domain_search", lambda *args, **kwargs: hunter)
    # Email Finder returns nothing so pattern inference is exercised for Bob.
    monkeypatch.setattr(agent, "hunter_email_finder", lambda *args, **kwargs: {})
    monkeypatch.setattr(agent, "infer_email", lambda name, domain: [])  # noqa: ARG005

    contacts = agent.find_relevant_contacts("Acme", "acme.com")
    assert len(contacts) == 3

    alice = next(c for c in contacts if c["linkedin"].endswith("/alice"))
    bob = next(c for c in contacts if c["linkedin"].endswith("/bob"))
    unknown = next(c for c in contacts if c["linkedin"].endswith("/unknown"))

    assert alice["email"] == "alice.smith@acme.com"
    assert alice["email_confidence"] == "high"
    assert alice["email_reference"]["source"] == "hunter_exact"

    assert bob["email"] == "bob.jones@acme.com"
    assert bob["email_confidence"] == "inferred"
    assert bob["email_reference"]["source"] == "hunter_pattern"

    assert unknown["email"] == ""
    assert unknown["email_confidence"] == "unknown"


def test_find_relevant_contacts_uses_hunter_finder(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hunter Email Finder is used when domain-search has no name match."""
    candidates = [
        {"name": "Carol White", "title": "Engineering Manager", "linkedin": "https://linkedin.com/in/carol"},
    ]
    # Domain-search returns records for a different person — no name match for Carol.
    hunter = [
        {"first_name": "Other", "last_name": "Person", "value": "other.person@acme.com", "confidence": 70},
    ]

    monkeypatch.setattr(agent, "find_linkedin_people", lambda *args, **kwargs: candidates)
    monkeypatch.setattr(agent, "hunter_domain_search", lambda *args, **kwargs: hunter)
    monkeypatch.setattr(
        agent,
        "hunter_email_finder",
        lambda first, last, domain, **kwargs: {"email": "carol.white@acme.com", "score": 91}
        if first == "carol"
        else {},
    )
    monkeypatch.setattr(agent, "infer_email", lambda name, domain: [])  # noqa: ARG005

    contacts = agent.find_relevant_contacts("Acme", "acme.com")
    assert len(contacts) == 1
    carol = contacts[0]
    assert carol["email"] == "carol.white@acme.com"
    assert carol["email_confidence"] == "high"
    assert carol["email_reference"]["source"] == "hunter_finder"
    assert carol["email_reference"]["score"] == 91


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
