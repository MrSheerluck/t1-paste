"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const LANGUAGES = [
  "text",
  "bash",
  "css",
  "go",
  "html",
  "javascript",
  "json",
  "markdown",
  "python",
  "rust",
  "sql",
  "typescript",
  "yaml",
];

const MAX_BYTES = 256 * 1024;

export function PasteEditor() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("text");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("unlisted");
  const [expiresIn, setExpiresIn] = useState("7d");
  const [password, setPassword] = useState("");
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sizeBytes = new TextEncoder().encode(content).byteLength;
  const isTooLarge = sizeBytes > MAX_BYTES;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (content.length === 0) {
      setError("Add some text before creating the paste.");
      return;
    }

    if (isTooLarge) {
      setError("This paste exceeds the 256 KB limit.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pastes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          content,
          title: title.trim() || undefined,
          language,
          visibility,
          expiresIn,
          password: password.trim() || undefined,
          burnAfterRead,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;

      if (!response.ok || !data?.url) {
        throw new Error(data?.message ?? "Could not create the paste.");
      }

      router.push(new URL(data.url).pathname);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Could not create the paste.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form className="editor-layout" onSubmit={handleSubmit}>
      <section className="editor-main">
        <div className="editor-heading">
          <div>
            <p className="eyebrow">New paste</p>
            <h1>Write something worth sharing.</h1>
          </div>
          <span className={isTooLarge ? "byte-count is-over" : "byte-count"}>
            {sizeBytes.toLocaleString()} / {MAX_BYTES.toLocaleString()} bytes
          </span>
        </div>

        <label className="field">
          <span>Title</span>
          <input
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional title"
            value={title}
          />
        </label>

        <label className="field field-grow">
          <span>Content</span>
          <textarea
            autoFocus
            className="editor-textarea"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste text, code, logs, or anything else."
            spellCheck={false}
            value={content}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="editor-submit">
          <p>
            Anonymous pastes are immutable and expire. Accounts unlock private pastes, custom slugs,
            and longer retention.
          </p>
          <button
            className="button button-primary"
            disabled={isSubmitting || isTooLarge}
            type="submit"
          >
            {isSubmitting ? "Creating…" : "Create paste"}
          </button>
        </div>
      </section>

      <aside className="editor-sidebar" aria-label="Paste options">
        <label className="field">
          <span>Language</span>
          <select onChange={(event) => setLanguage(event.target.value)} value={language}>
            {LANGUAGES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Visibility</span>
          <select
            onChange={(event) => setVisibility(event.target.value as "public" | "unlisted")}
            value={visibility}
          >
            <option value="unlisted">Unlisted — link only</option>
            <option value="public">Public — may be indexed</option>
          </select>
        </label>

        <label className="field">
          <span>Expires</span>
          <select onChange={(event) => setExpiresIn(event.target.value)} value={expiresIn}>
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
          </select>
        </label>

        <label className="field">
          <span>Password</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Optional"
            type="password"
            value={password}
          />
        </label>

        <label className="checkbox-field">
          <input
            checked={burnAfterRead}
            onChange={(event) => {
              const checked = event.target.checked;
              setBurnAfterRead(checked);

              if (checked) {
                setVisibility("unlisted");
              }
            }}
            type="checkbox"
          />
          <span>
            Burn after read
            <small>Deleted after the first successful read.</small>
          </span>
        </label>

        <div className="sidebar-note">
          <p className="eyebrow">Limits</p>
          <p>256 KB of UTF-8 text. Anonymous pastes last up to 7 days.</p>
        </div>
      </aside>
    </form>
  );
}
