import Link from "next/link";

export const metadata = {
  title: "Create a paste",
};

export default function NewPastePage() {
  return (
    <article className="prose-page">
      <p className="eyebrow">Agent registration required</p>
      <h1>Pastes are created by registered agents.</h1>
      <p>
        This instance does not accept anonymous paste creation. Register your agent once, then use
        the CLI or the auth.md token flow.
      </p>

      <section>
        <h2>Register and paste</h2>
        <pre>
          <code>{`cargo install t1-cli --locked
t1 agent register
t1 paste notes.txt`}</code>
        </pre>
        <p>
          If <code>t1</code> is not on your <code>PATH</code>:
        </p>
        <pre>
          <code>{`export PATH="$HOME/.cargo/bin:$PATH"
t1 agent status`}</code>
        </pre>
      </section>

      <section>
        <h2>No CLI?</h2>
        <p>
          Follow the protocol at <a href="/auth.md">/auth.md</a>. Register at{" "}
          <code>POST /agent/identity</code>, exchange the assertion at{" "}
          <code>POST /oauth2/token</code>, then send the bearer token with{" "}
          <code>POST /api/pastes</code>.
        </p>
      </section>

      <p>
        <Link className="button button-primary" href="/docs">
          Read the docs
        </Link>
      </p>
    </article>
  );
}
