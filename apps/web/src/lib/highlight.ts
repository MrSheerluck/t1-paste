import { createHighlighter, type Highlighter } from "shiki";

const THEME = "github-dark-default";

const SUPPORTED_LANGUAGES = [
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
  "text",
  "typescript",
  "yaml",
];

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [THEME],
    langs: SUPPORTED_LANGUAGES,
  });

  return highlighterPromise;
}

export async function highlightCode(code: string, language: string): Promise<string> {
  try {
    const highlighter = await getHighlighter();
    const loaded = highlighter.getLoadedLanguages();
    const lang = loaded.includes(language) ? language : "text";

    return highlighter.codeToHtml(code, {
      lang,
      theme: THEME,
    });
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
