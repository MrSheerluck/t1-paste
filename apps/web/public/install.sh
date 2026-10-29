#!/usr/bin/env sh
set -eu

REPO="${T1_REPO:-MrSheerluck/t1-paste}"
REF="${T1_REF:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required to install t1" >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: cargo is required to build t1 from source" >&2
  echo "Install Rust from https://rustup.rs and run this script again." >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

echo "Cloning $REPO ($REF)..."
git clone --depth 1 --branch "$REF" "https://github.com/$REPO.git" "$tmp_dir/t1-paste" >/dev/null

echo "Building t1..."
cargo install --path "$tmp_dir/t1-paste/apps/cli" --locked

echo
echo "Installed t1."
echo "If the command is not found, use the absolute path:"
echo '  "$HOME/.cargo/bin/t1" --version'
echo
echo "Or add it to PATH:"
echo '  export PATH="$HOME/.cargo/bin:$PATH"'
echo
echo "For the local POC:"
echo '  T1_API_URL=http://localhost:8787 "$HOME/.cargo/bin/t1" paste file.txt'
