import Link from "next/link";

export const metadata = {
  title: "Docs",
};

export default function DocsPage() {
  return (
    <article className="prose-page">
      <p className="eyebrow">Docs</p>
      <h1>Use t1-paste from anywhere.</h1>

      <section>
        <h2>Create a paste with curl</h2>
        <pre>
          <code>{`curl -sS --data-binary @notes.txt \\
  http://localhost:3000/api/pastes`}</code>
        </pre>
        <p>
          The response is a plain URL. Add <code>Accept: text/plain</code> to make that explicit.
          Add <code>?expires=1h</code>, <code>?visibility=public</code>,{" "}
          <code>?lang=typescript</code>, or <code>?burn=1</code> to change the defaults.
        </p>
      </section>

      <section>
        <h2>Create a paste with the CLI</h2>
        <pre>
          <code>{`t1 paste notes.txt
t1 paste - < notes.txt
t1 get http://localhost:3000/abc123`}</code>
        </pre>
        <p>
          The CLI prints only the URL for <code>paste</code> and only the content for{" "}
          <code>get</code>. That is deliberate: agents should not pay for JSON envelopes they did
          not ask for.
        </p>
      </section>

      <section>
        <h2>Read a paste</h2>
        <pre>
          <code>{`GET /api/pastes/:slug
GET /api/pastes/:slug/raw
GET /api/pastes/:slug/meta`}</code>
        </pre>
        <p>
          Use <code>/meta</code> when you only need metadata. Use <code>/raw</code> for the exact
          text. Password-protected pastes accept an <code>x-paste-password</code> header.
        </p>
      </section>

      <section>
        <h2>Agent registration</h2>
        <p>
          Anonymous pastes need no account. For private pastes or 30-day retention, register an
          anonymous agent through the self-hosted <code>auth.md</code> flow:
        </p>
        <pre>
          <code>{`t1 agent register
t1 agent status
t1 paste notes.txt --visibility private --expires 30d`}</code>
        </pre>
        <p>
          The protocol is documented at <a href="/auth.md">/auth.md</a>. This instance supports
          anonymous registration only. There are no human accounts, email verification, or claim
          ceremonies.
        </p>
      </section>

      <section>
        <h2>Limits</h2>
        <ul>
          <li>256 KB of UTF-8 text per paste.</li>
          <li>7-day maximum expiry for anonymous pastes.</li>
          <li>Unlisted by default.</li>
          <li>No files, images, or binary uploads.</li>
          <li>Burn-after-read pastes are deleted on the first explicit read.</li>
        </ul>
      </section>

      <section>
        <h2>Agent discovery</h2>
        <ul>
          <li>
            <a href="/llms.txt">/llms.txt</a> — short usage index
          </li>
          <li>
            <a href="/AGENTS.md">/AGENTS.md</a> — agent-facing instructions
          </li>
          <li>
            <a href="/openapi.json">/openapi.json</a> — API schema
          </li>
          <li>
            <a href="/security">/security</a> — vulnerability reporting
          </li>
        </ul>
      </section>

      <p>
        <Link className="button button-primary" href="/new">
          Create a paste
        </Link>
      </p>
    </article>
  );
}
