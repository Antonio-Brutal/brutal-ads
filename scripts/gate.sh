#!/usr/bin/env bash
# Gate dispatcher — `pnpm gate:P<N>` lands here (docs/10 §0.5 conventions).
# Each phase's checks live in scripts/gate-P<N>.sh; the builder creates them as phases are
# implemented, per the authoritative gate definition in docs/10-build-plan.md.
set -euo pipefail

PHASE="${1:?usage: scripts/gate.sh P<N>   (e.g. scripts/gate.sh P0)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/gate-$PHASE.sh"

if [[ ! -f "$SCRIPT" ]]; then
  echo "GATE $PHASE: FAIL — $SCRIPT does not exist yet."
  echo "Implement it from the authoritative definition in docs/10-build-plan.md"
  echo "(section \"Acceptance gate — $PHASE\"). Gates assert BUILT behavior, never stubs."
  exit 1
fi

echo "── GATE $PHASE ──────────────────────────────────────────────"
bash "$SCRIPT"
echo "── GATE $PHASE: PASS ───────────────────────────────────────"
