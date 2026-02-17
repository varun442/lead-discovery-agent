import os
import sys

import requests
from dotenv import load_dotenv


def main() -> int:
    load_dotenv(".env", override=True)
    api_key = os.getenv("SERPAPI_KEY", "").strip()

    if not api_key:
        print("FAIL: SERPAPI_KEY is missing in .env")
        return 1

    print(f"SERPAPI_KEY loaded: yes (length={len(api_key)})")

    try:
        account_resp = requests.get(
            "https://serpapi.com/account",
            params={"api_key": api_key},
            timeout=20,
        )
        account_data = account_resp.json()
    except Exception as exc:
        print(f"FAIL: account check request failed: {exc}")
        return 1

    print(f"account_status={account_resp.status_code}")
    print(f"account_error={account_data.get('error')}")
    print(f"plan_name={account_data.get('plan_name')}")
    print(f"searches_left={account_data.get('total_searches_left')}")

    if account_resp.status_code != 200 or account_data.get("error"):
        print("FAIL: SerpAPI key is invalid or account is not usable.")
        return 1

    query = 'site:linkedin.com/in "Stripe" "software engineer"'
    try:
        search_resp = requests.get(
            "https://serpapi.com/search",
            params={
                "engine": "google",
                "q": query,
                "api_key": api_key,
                "num": 5,
            },
            timeout=20,
        )
        search_data = search_resp.json()
    except Exception as exc:
        print(f"FAIL: search request failed: {exc}")
        return 1

    organic = search_data.get("organic_results", []) or []
    print(f"search_status={search_resp.status_code}")
    print(f"search_error={search_data.get('error')}")
    print(f"organic_results={len(organic)}")
    if organic:
        print(f"first_result={organic[0].get('link')}")

    if search_resp.status_code != 200 or search_data.get("error"):
        print("FAIL: Search call failed even though account check passed.")
        return 1

    print("PASS: SerpAPI key works and search endpoint is returning results.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
