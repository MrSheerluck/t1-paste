#!/usr/bin/env sh
set -eu

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: cargo is required to install t1" >&2
  echo "Install Rust from https://rustup.rs and run this script again." >&2
  exit 1
fi

if cargo install t1-cli --locked; then
  :
else
  echo "crates.io install failed; building from source instead..." >&2

  if ! command -v git >/dev/null 2>&1; then
    echo "error: git is required for the source fallback" >&2
    exit 1
  fi

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT INT TERM

  git clone --depth 1 --branch "${T1_REF:-main}" \
    "https://github.com/${T1_REPO:-MrSheerluck/t1-paste}.git" \
    "$tmp_dir/t1-paste" >/dev/null

  cargo install --path "$tmp_dir/t1-paste/apps/cli" --locked
fi

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
