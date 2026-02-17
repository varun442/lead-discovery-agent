# GitHub Branch Protection (Required CI Before Merge)

Use this once on your GitHub repo to block merges unless tests pass.

## Goal
- Protect `main`
- Force pull requests
- Require passing unit-test checks

## Steps (GitHub UI)
1. Open your repo: `https://github.com/varun442/lead-discovery-agent`
2. Go to `Settings` → `Branches`
3. Under `Branch protection rules`, click `Add rule`
4. Branch name pattern: `main`
5. Enable:
   - `Require a pull request before merging`
   - `Require status checks to pass before merging`
6. In required checks, select the checks from workflow `Tests`:
   - `Backend (pytest)`
   - `Frontend (vitest)`
7. Optional but recommended:
   - `Require branches to be up to date before merging`
   - `Do not allow bypassing the above settings`
8. Click `Create` (or `Save changes`)

## Important note
- If checks are not visible in step 6, run one PR/push first so GitHub can discover the check names from:
  - `.github/workflows/tests.yml`

## Result
- No one can merge into `main` unless both backend and frontend unit tests are green.
