import argparse
import json
from datetime import datetime

from dotenv import load_dotenv

from agent import run_agent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lead agent: find engineering and hiring contacts")
    parser.add_argument("--website", required=True, help="Company website URL")
    parser.add_argument("--linkedin", required=True, help="LinkedIn company page URL")
    parser.add_argument("--quiet", action="store_true", help="Disable live progress logs")
    return parser.parse_args()


def main() -> None:
    load_dotenv(override=True)
    args = parse_args()

    progress = None
    if not args.quiet:
        def progress(message: str) -> None:
            now = datetime.now().strftime("%H:%M:%S")
            print(f"[{now}] {message}", flush=True)

    result = run_agent(args.website, args.linkedin, progress=progress)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
