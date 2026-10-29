import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { BurnReveal } from "@/components/burn-reveal";
import { CopyButton } from "@/components/copy-button";
import { PasswordPrompt } from "@/components/password-prompt";
import { ApiError, fetchPasteContent, fetchPasteMeta, type PasteMeta } from "@/lib/api";
import { highlightCode } from "@/lib/highlight";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const meta = await fetchPasteMeta(slug);

    return {
      title: meta.title ?? meta.slug,
      description: `A ${meta.language} paste on t1-paste.`,
      robots: meta.visibility === "public" ? undefined : { index: false, follow: false },
    };
  } catch {
    return { title: "Paste" };
  }
}

export default async function PastePage({ params }: PageProps) {
  const { slug } = await params;
  let meta: PasteMeta;

  try {
    meta = await fetchPasteMeta(slug);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
      notFound();
    }

    throw error;
  }

  const isLocked = meta.has_password || meta.burn_after_read;
  const content = isLocked ? null : await fetchPasteContent(slug);
  const highlighted = content ? await highlightCode(content, meta.language) : null;
  const showRaw = !isLocked;

  return (
    <article className="paste-page">
      <header className="paste-header">
        <div>
          <p className="eyebrow">
            {meta.visibility} · {meta.language}
          </p>
          <h1>{meta.title ?? meta.slug}</h1>
        </div>

        <div className="paste-actions">
          {content ? <CopyButton value={content} /> : null}
          {showRaw ? (
            <>
              <a className="button button-small" href={`/${slug}/raw`}>
                Raw
              </a>
              <a className="button button-small" href={`/api/pastes/${slug}/raw?download=1`}>
                Download
              </a>
            </>
          ) : null}
        </div>
      </header>

      <div className="paste-meta">
        <span>{meta.size_bytes.toLocaleString()} bytes</span>
        <span>{meta.view_count.toLocaleString()} views</span>
        <span>expires {formatDate(meta.expires_at)}</span>
        <span>created {formatDate(meta.created_at)}</span>
      </div>

      {meta.burn_after_read ? (
        <BurnReveal slug={slug} />
      ) : meta.has_password ? (
        <PasswordPrompt language={meta.language} slug={slug} />
      ) : highlighted ? (
        // Shiki escapes paste content before emitting highlighted HTML.
        <div className="paste-content shiki" dangerouslySetInnerHTML={{ __html: highlighted }} />
      ) : (
        <pre className="paste-content">
          <code>{content}</code>
        </pre>
      )}

      <footer className="paste-footer">
        <Link className="button button-small" href="/new">
          Create your own
        </Link>
        <span>
          Short link: <code>/{slug}</code>
        </span>
      </footer>
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
