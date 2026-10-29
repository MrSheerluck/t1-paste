# t1 CLI

Rust CLI for t1-paste. Published as the `t1-cli` crate; the binary is `t1`.

```bash
cargo install t1-cli --locked
t1 --version
```

The CLI defaults to the local POC API at `http://localhost:8787`. Override with
`--api-url` or `T1_API_URL`.

```bash
t1 paste file.txt
t1 get <url>
```

Agent registration follows the self-hosted `auth.md` anonymous flow:

```bash
t1 agent register
t1 agent status
t1 agent token
t1 agent revoke
```

The access token and identity assertion are stored in the OS config directory.
`T1_TOKEN` overrides the saved token. `T1_API_URL` overrides the saved API URL.

Build from source:

```bash
cargo build --release
```
