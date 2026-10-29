# t1 CLI

Rust CLI for t1-paste.

```bash
cargo run -- --api-url http://localhost:8787 paste file.txt
cargo run -- --api-url http://localhost:8787 get <url>
```

Agent registration follows the self-hosted `auth.md` anonymous flow:

```bash
cargo run -- --api-url http://localhost:8787 agent register
cargo run -- agent status
cargo run -- agent token
cargo run -- agent revoke
```

The access token and identity assertion are stored in the OS config directory.
`T1_TOKEN` overrides the saved token. `T1_API_URL` overrides the saved API URL.

Build a release binary:

```bash
cargo build --release
```

The binary name is `t1`.
