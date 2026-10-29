import type { NextConfig } from "next";

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
      {
        source: "/openapi.json",
        destination: `${apiInternalUrl}/openapi.json`,
      },
      {
        source: "/auth.md",
        destination: `${apiInternalUrl}/auth.md`,
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: `${apiInternalUrl}/.well-known/oauth-protected-resource`,
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: `${apiInternalUrl}/.well-known/oauth-authorization-server`,
      },
      {
        source: "/agent/:path*",
        destination: `${apiInternalUrl}/agent/:path*`,
      },
      {
        source: "/oauth2/:path*",
        destination: `${apiInternalUrl}/oauth2/:path*`,
      },
    ];
  },
};

export default nextConfig;
