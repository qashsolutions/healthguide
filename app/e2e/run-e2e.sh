#!/bin/bash
# HealthGuide E2E Suite Runner
#
# Runs all Playwright E2E tests (160 tests in 6 groups).
# Each serial group gets a fresh Metro session to avoid the Metro/Expo
# one-authenticated-load-per-session limitation.
#
# Usage:
#   cd app && bash e2e/run-e2e.sh             # headless
#   cd app && bash e2e/run-e2e.sh --headed    # visible browser
#
# Individual groups (recommended — always pass independently):
#   npm run e2e:auth       # 49 tests
#   npm run e2e:agency     # 37 tests
#   npm run e2e:caregiver  # 30 tests
#   npm run e2e:careseeker # 18 tests
#   npm run e2e:family     # 19 tests
#   npm run e2e:cross      #  8 tests (minus 1 skipped)

set -uo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$(dirname "$0")/playwright.config.ts"
EXTRA_ARGS="${*:-}"

cd "$APP_DIR"

PASS=0; FAIL=0; TOTAL=0

# Kill Metro and clean cached state so the next group gets a fresh session.
kill_metro() {
  local pids
  pids=$(lsof -ti:8081 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 2
    pids=$(lsof -ti:8081 2>/dev/null || true)
    [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
  # Wait for port to be free
  for _ in $(seq 1 20); do lsof -ti:8081 >/dev/null 2>&1 || break; sleep 0.5; done
  rm -rf "$APP_DIR/.expo" "$APP_DIR/test-results" "$APP_DIR/playwright-report" 2>/dev/null || true
  sleep 5
}

run_spec() {
  local label="$1"; shift
  TOTAL=$((TOTAL + 1))
  echo ""
  echo "── $label ──"
  # shellcheck disable=SC2086
  if npx playwright test "$@" --config="$CONFIG" --reporter=list $EXTRA_ARGS; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
}

trap kill_metro EXIT

echo "==========================================="
echo "  HealthGuide E2E Suite (160 tests)"
echo "==========================================="

# Public pages — share one Metro session
kill_metro
run_spec "Auth (49 tests)"       e2e/01-auth/
run_spec "Cross-Role (8 tests)"  e2e/06-cross-role/

# Serial specs — fresh Metro per group
kill_metro
run_spec "Agency Owner (37 tests)"  e2e/02-agency/agency-owner.serial.spec.ts

kill_metro
run_spec "Caregiver (30 tests)"     e2e/03-caregiver/caregiver.serial.spec.ts

kill_metro
run_spec "Careseeker (18 tests)"    e2e/04-careseeker/careseeker.serial.spec.ts

kill_metro
run_spec "Family Member (19 tests)" e2e/05-family/family-member.serial.spec.ts

# Summary
echo ""
echo "==========================================="
echo "  E2E Suite: $PASS/$TOTAL groups passed, $FAIL failed"
echo "==========================================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
