#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "" || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Uso:
  bash ./scripts/release.sh <patch|minor|major>

Que hace:
  1) Verifica que el arbol de git este limpio
  2) Incrementa version con npm version
  3) Hace push de commit y tags
  4) Crea GitHub Release con gh (y adjunta APK debug si existe)
EOF
  exit 0
fi

BUMP_TYPE="$1"
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Tipo de version no valido: $BUMP_TYPE"
  echo "Usa: patch | minor | major"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Tu repo tiene cambios sin commit. Haz commit/stash antes de release."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Aviso: estas en la rama '$CURRENT_BRANCH' (recomendado: main)."
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "No se encontro GitHub CLI (gh)."
  echo "Instala gh y autentica con: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI no esta autenticado. Ejecuta: gh auth login"
  exit 1
fi

npm version "$BUMP_TYPE"
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"

git push
git push --tags

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK_PATH" ]]; then
  gh release create "$TAG" \
    --title "PagaYa $TAG" \
    --generate-notes \
    "$APK_PATH"
else
  gh release create "$TAG" \
    --title "PagaYa $TAG" \
    --generate-notes
fi

echo "Release creada: $TAG"
