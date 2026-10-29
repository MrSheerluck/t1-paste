const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

export type PasteMeta = {
  id: string;
  slug: string;
  title: string | null;
  language: string;
  visibility: "public" | "unlisted" | "private";
  size_bytes: number;
  burn_after_read: boolean;
  has_password: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchPasteMeta(slug: string): Promise<PasteMeta> {
  const response = await fetch(`${API_INTERNAL_URL}/api/pastes/${encodeURIComponent(slug)}/meta`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;

    throw new ApiError(
      response.status,
      problem?.error ?? "request_failed",
      problem?.message ?? "Could not load the paste.",
    );
  }

  return (await response.json()) as PasteMeta;
}

export async function fetchPasteContent(slug: string): Promise<string> {
  const response = await fetch(`${API_INTERNAL_URL}/api/pastes/${encodeURIComponent(slug)}/raw`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;

    throw new ApiError(
      response.status,
      problem?.error ?? "request_failed",
      problem?.message ?? "Could not load the paste.",
    );
  }

  return response.text();
}
