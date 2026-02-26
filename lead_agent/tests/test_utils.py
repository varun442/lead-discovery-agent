from __future__ import annotations

import pytest

import utils


def test_extract_domain_variants() -> None:
    assert utils.extract_domain("https://www.ncrvoyix.com") == "ncrvoyix.com"
    assert utils.extract_domain("http://careers.stripe.com/jobs") == "stripe.com"
    assert utils.extract_domain("stripe.com") == "stripe.com"
    assert utils.extract_domain("") == ""


def test_extract_company_name_from_linkedin_url() -> None:
    assert (
        utils.extract_company_name_from_linkedin_url("https://www.linkedin.com/company/greenhouse-software/")
        == "Greenhouse Software"
    )
    assert utils.extract_company_name_from_linkedin_url("https://www.linkedin.com/in/someone/") == ""


def test_infer_email_patterns_and_dedupe() -> None:
    emails = utils.infer_email("Varun Savai", "example.com")
    assert emails == [
        "varun.savai@example.com",
        "vsavai@example.com",
        "varun@example.com",
    ]

    single_name = utils.infer_email("Prince", "example.com")
    assert single_name == ["prince@example.com"]


def test_find_linkedin_people_filters_non_matching_company(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_serp_search(_query: str) -> dict:
        return {
            "organic_results": [
                {
                    "link": "https://www.linkedin.com/in/right-person",
                    "title": "A Right - Senior Software Engineer at Nutanix | LinkedIn",
                    "snippet": "Senior Software Engineer at Nutanix working on distributed systems."
                },
                {
                    "link": "https://www.linkedin.com/in/wrong-person",
                    "title": "B Wrong - Senior Software Engineer at OtherCo | LinkedIn",
                    "snippet": "Engineer at OtherCo with cloud background."
                },
            ]
        }

    monkeypatch.setattr(utils, "serp_search", fake_serp_search)

    people = utils.find_linkedin_people(
        company_name="Nutanix",
        keywords=["software", "engineer"],
        linkedin_company_url="https://www.linkedin.com/company/nutanix/",
        domain="nutanix.com",
    )

    assert len(people) == 1
    assert people[0]["linkedin"] == "https://www.linkedin.com/in/right-person"


def test_find_linkedin_people_raises_when_all_queries_fail(monkeypatch: pytest.MonkeyPatch) -> None:
    def always_fail(_query: str) -> dict:
        raise RuntimeError("serp down")

    monkeypatch.setattr(utils, "serp_search", always_fail)

    with pytest.raises(RuntimeError, match="All SerpAPI employee-search queries failed"):
        utils.find_linkedin_people("Stripe", ["software"], domain="stripe.com")


def test_company_match_score_handles_compound_alias_variants() -> None:
    score = utils._company_match_score(  # noqa: SLF001
        title="Siddhant Sethi - Software Engineering @ Juul Labs",
        snippet="Experience: Juul Labs",
        company_name="Juullabs",
        keywords=["software", "engineer", "developer", "engineering"],
        linkedin_company_url="https://www.linkedin.com/company/juullabs/",
        domain="juullabs.com",
    )
    assert score >= 2


def test_company_match_score_stays_strict_for_single_token_noise() -> None:
    score = utils._company_match_score(  # noqa: SLF001
        title="Greenhouse Manager at Gully Greenhouse",
        snippet="Operations manager at Gully Greenhouse, not Greenhouse Software.",
        company_name="Greenhouse",
        keywords=["manager", "hiring", "talent"],
        linkedin_company_url="https://www.linkedin.com/company/greenhouse-software/",
        domain="greenhouse.io",
    )
    assert score == 1


def test_hunter_domain_search_missing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HUNTER_API_KEY", raising=False)
    with pytest.raises(ValueError, match="Missing HUNTER_API_KEY"):
        utils.hunter_domain_search("stripe.com")


def test_hunter_domain_search_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HUNTER_API_KEY", "abc")

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"data": {"emails": [{"value": "a@stripe.com"}]}}

    def fake_get(*args, **kwargs):  # noqa: ANN002, ANN003
        return FakeResponse()

    monkeypatch.setattr(utils.requests, "get", fake_get)
    emails = utils.hunter_domain_search("stripe.com")
    assert emails == [{"value": "a@stripe.com"}]


def test_apollo_enrich_person_missing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("APOLLO_API_KEY", raising=False)
    payload = utils.apollo_enrich_person("Alice", "Smith", "acme.com")
    assert payload == {}


def test_apollo_enrich_person_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APOLLO_API_KEY", "apollo-key")

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"person": {"email": "alice@acme.com", "email_status": "verified"}}

    def fake_post(*args, **kwargs):  # noqa: ANN002, ANN003
        assert kwargs["headers"]["x-api-key"] == "apollo-key"
        assert kwargs["json"]["first_name"] == "Alice"
        assert kwargs["json"]["last_name"] == "Smith"
        assert kwargs["json"]["organization_domains"] == ["acme.com"]
        return FakeResponse()

    monkeypatch.setattr(utils.requests, "post", fake_post)
    payload = utils.apollo_enrich_person("Alice", "Smith", "acme.com")
    assert payload["person"]["email"] == "alice@acme.com"


def test_apollo_extract_email_and_status() -> None:
    payload = {"person": {"work_email": "alice@acme.com", "email_status": "verified"}}
    assert utils.apollo_extract_email(payload) == "alice@acme.com"
    assert utils.apollo_status(payload) == "verified"

    assert utils.apollo_extract_email({}) == ""
    assert utils.apollo_status({}) == "apollo"


def test_get_company_metadata_from_knowledge_graph(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_search(_query: str) -> dict:
        return {
            "knowledge_graph": {
                "type": "Financial Technology",
                "headquarters": "San Francisco, California",
            }
        }

    monkeypatch.setattr(utils, "serp_search", fake_search)
    meta = utils.get_company_metadata("Stripe", "https://linkedin.com/company/stripe", "stripe.com")

    assert meta["industry"] == "Financial Technology"
    assert meta["location"] == "San Francisco, California"
    assert "stripe.com" in meta["company_logo"]
