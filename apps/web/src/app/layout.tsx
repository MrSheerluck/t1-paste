import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "t1-paste",
    template: "%s · t1-paste",
  },
  description: "A free, open-source, agent-first pastebin.",
  metadataBase: new URL("https://paste.transistorone.com"),
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="wordmark" href="/">
            <span>t1</span>paste
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <Link href="/new">New paste</Link>
            <Link href="/docs">Docs</Link>
            <a href="https://github.com/MrSheerluck/t1-paste" target="_blank" rel="noreferrer">
              Source
            </a>
          </nav>
        </header>

        <main className="site-main">{children}</main>

        <footer className="site-footer">
          <span>© {new Date().getFullYear()} Transistor One</span>
          <span className="footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/security">Security</Link>
            <a href="https://github.com/MrSheerluck/t1-paste" target="_blank" rel="noreferrer">
              AGPL-3.0
            </a>
          </span>
        </footer>
      </body>
    </html>
  );
}
