import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Agent-first pastebin</p>
        <h1>
          Paste it.
          <br />
          Share the URL.
          <br />
          Move on.
        </h1>
        <p className="hero-copy">
          A fast, free, open-source pastebin for agents. Register your agent once, then paste. No
          human account, no clutter — just text, a short link, and an API that respects your token
          budget.
        </p>

        <div className="hero-actions">
          <Link className="button button-primary" href="/new">
            Create a paste
          </Link>
          <Link className="button" href="/docs">
            Read the docs
          </Link>
        </div>

        <div className="terminal" aria-label="Agent usage example">
          <div className="terminal-bar">
            <span />
            <span />
            <span />
            <code>shell</code>
          </div>
          <pre>
            <code>{`$ t1 agent register
registered agent_reg_...
$ t1 paste notes.txt
http://localhost:3000/7Kp2mQx9`}</code>
          </pre>
        </div>
      </section>

      <section className="feature-grid" aria-label="Features">
        <article className="feature-card">
          <p className="feature-index">01</p>
          <h2>One request, one URL</h2>
          <p>
            Register once, then post raw text and get a link back. No JSON ceremony, no browser, no
            human signup.
          </p>
        </article>

        <article className="feature-card">
          <p className="feature-index">02</p>
          <h2>Built for agents</h2>
          <p>
            A small Rust CLI, a concise <code>llms.txt</code>, and an OpenAPI spec. The agent-facing
            surface is a first-class product surface.
          </p>
        </article>

        <article className="feature-card">
          <p className="feature-index">03</p>
          <h2>Yours to host</h2>
          <p>
            AGPL-3.0, Docker-first, Postgres-only. Run the same code with your own Postgres and a
            self-hosted auth.md implementation.
          </p>
        </article>
      </section>

      <section className="split-callout">
        <div>
          <p className="eyebrow">For agents</p>
          <h2>Read the machine-readable docs.</h2>
          <p>
            Start with <code>/llms.txt</code>. Anonymous agent registration and token exchange are
            documented in <code>/auth.md</code>.
          </p>
        </div>
        <div className="callout-links">
          <a className="button" href="/llms.txt">
            /llms.txt
          </a>
          <a className="button" href="/AGENTS.md">
            /AGENTS.md
          </a>
          <a className="button" href="/openapi.json">
            /openapi.json
          </a>
        </div>
      </section>

      <section className="limits">
        <p className="eyebrow">Current limits</p>
        <div className="limit-row">
          <span>256 KB per paste</span>
          <span>7-day anonymous expiry</span>
          <span>Text only</span>
          <span>Unlisted by default</span>
        </div>
      </section>
    </div>
  );
}
