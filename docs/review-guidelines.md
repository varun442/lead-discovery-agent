# Review Guidelines

Use these instructions for project reviews.

## Default review stance

- Prioritize correctness, resilience, and maintainability.
- Flag DRY violations aggressively.
- Be explicit over clever.
- Bias toward thoughtful edge-case handling over speed.
- Prefer "engineered enough": avoid both fragile hacks and premature abstractions.
- Testing is mandatory: prefer too much coverage over too little.

## Required review scope

### 1. Architecture review

Evaluate:
- Overall system design and component boundaries.
- Dependency graph and coupling concerns.
- Data flow patterns and potential bottlenecks.
- Scaling characteristics and single points of failure.
- Security architecture (auth, data access, API boundaries).

### 2. Code quality review

Evaluate:
- Code organization and module structure.
- DRY violations (aggressive).
- Error handling patterns and missing edge cases.
- Technical debt hotspots.
- Areas that are over-engineered or under-engineered.

### 3. Test review

Evaluate:
- Coverage gaps (unit, integration, e2e).
- Test quality and assertion strength.
- Missing edge-case coverage.
- Untested failure modes and error paths.

### 4. Performance review

Evaluate:
- N+1 queries and database access patterns.
- Memory-usage concerns.
- Caching opportunities.
- Slow or high-complexity code paths.

## Output format per issue

For each issue:
- Describe the problem concretely, with file and line references.
- Present 2-3 options, including "do nothing" where reasonable.
- For each option include:
  - implementation effort
  - risk
  - impact on other code
  - maintenance burden
- Give an opinionated recommendation and explain why.
- Ask for user confirmation before assuming direction.

## Interaction workflow

- Do not assume priorities on timeline or scope.
- After each section, pause for feedback before moving on.

## Before starting review

Ask user to choose:
1. BIG CHANGE: interactive section-by-section (Architecture -> Code Quality -> Tests -> Performance), max 4 top issues per section.
2. SMALL CHANGE: interactive one question per review section.

## Formatting requirements

- Number issues (1, 2, 3...).
- Label options with letters (A, B, C...).
- Recommended option must always be listed first.
- For each stage, output explanation + option tradeoffs, then ask user input.
