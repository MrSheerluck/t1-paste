# t1 CLI

Rust CLI for t1-paste.

```bash
cargo run -- --api-url http://localhost:8787 paste file.txt
cargo run -- --api-url http://localhost:8787 get <url>
```

Build a release binary:

```bash
cargo build --release
```

The binary name is `t1`.
