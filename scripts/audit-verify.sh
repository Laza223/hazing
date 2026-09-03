#!/bin/bash
# Juez de verificación INMUTABLE — ver docs/spec/04-calidad.md.
# Nadie que aplique fixes de una auditoría o lista de hallazgos edita este archivo
# (está en la deny-list de .claude/settings.json). Solo un humano lo actualiza
# cuando cambia el tooling del stack.

set -e

TYPECHECK_CMD="${TYPECHECK_CMD:-pnpm typecheck}"
LINT_CMD="${LINT_CMD:-pnpm lint}"
TEST_CMD="${TEST_CMD:-pnpm test}"
FORMAT_CMD="${FORMAT_CMD:-pnpm format:check}"

echo "=== [1/4] Format ==="
$FORMAT_CMD
echo "OK Format pass"

echo "=== [2/4] TypeCheck ==="
$TYPECHECK_CMD
echo "OK TypeCheck pass"

echo "=== [3/4] Lint ==="
$LINT_CMD
echo "OK Lint pass"

echo "=== [4/4] Unit tests ==="
$TEST_CMD
echo "OK Unit tests pass"

echo ""
echo "VERIFICATION COMPLETE — all checks passed"
