"use client";

import { useState } from "react";

export function BurnReveal({ slug }: { slug: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [consumed, setConsumed] = useState(false);

  async function reveal() {
    setError(null);
    setIsRevealing(true);

    try {
      const response = await fetch(`/api/pastes/${slug}/raw?burn=1`);

      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(problem?.message ?? "This paste has already been consumed.");
      }

      setContent(await response.text());
      setConsumed(true);
    } catch (revealError) {
      setError(
        revealError instanceof Error
          ? revealError.message
          : "This paste has already been consumed.",
      );
    } finally {
      setIsRevealing(false);
    }
  }

  if (content) {
    return (
      <div>
        <pre className="paste-content">
          <code>{content}</code>
        </pre>
        <p className="burn-note">This paste has been deleted. Copy it now if you need it.</p>
      </div>
    );
  }

  return (
    <div className="burn-card">
      <p className="eyebrow">Burn after read</p>
      <h2>This paste can be read once.</h2>
      <p>Revealing it deletes it from the server. Do not use this for anything you need to keep.</p>
      {error ? <p className="form-error">{error}</p> : null}
      <button
        className="button button-danger"
        disabled={isRevealing || consumed}
        onClick={reveal}
        type="button"
      >
        {isRevealing ? "Revealing…" : "Reveal once"}
      </button>
    </div>
  );
}
