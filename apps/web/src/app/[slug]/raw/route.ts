import { NextResponse, type NextRequest } from "next/server";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const target = new URL(`/api/pastes/${encodeURIComponent(slug)}/raw`, API_INTERNAL_URL);

  for (const key of ["burn", "download"]) {
    const value = request.nextUrl.searchParams.get(key);

    if (value) {
      target.searchParams.set(key, value);
    }
  }

  const password = request.headers.get("x-paste-password");
  const response = await fetch(target, {
    cache: "no-store",
    headers: password ? { "x-paste-password": password } : undefined,
  });

  const headers = new Headers();
  headers.set("content-type", response.headers.get("content-type") ?? "text/plain; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");

  const disposition = response.headers.get("content-disposition");

  if (disposition) {
    headers.set("content-disposition", disposition);
  }

  return new NextResponse(await response.text(), {
    status: response.status,
    headers,
  });
}
