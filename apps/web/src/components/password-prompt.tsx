"use client";

import { useState, type FormEvent } from "react";

export function PasswordPrompt({ slug, language }: { slug: string; language: string }) {
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/pastes/${slug}/raw`, {
        headers: { "x-paste-password": password },
      });

      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(problem?.message ?? "Could not unlock this paste.");
      }

      setContent(await response.text());
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Could not unlock this paste.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (content) {
    return (
      <pre className="paste-content" data-language={language}>
        <code>{content}</code>
      </pre>
    );
  }

  return (
    <form className="unlock-card" onSubmit={unlock}>
      <p className="eyebrow">Password protected</p>
      <h2>This paste is locked.</h2>
      <p>Enter the password to reveal the content.</p>
      <label className="field">
        <span>Password</span>
        <input
          autoFocus
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button
        className="button button-primary"
        disabled={isSubmitting || password.length === 0}
        type="submit"
      >
        {isSubmitting ? "Unlocking…" : "Unlock paste"}
      </button>
    </form>
  );
}
