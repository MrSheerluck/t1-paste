use std::io::{self, IsTerminal, Read};
use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand};
use serde_json::json;
use url::Url;

#[derive(Debug, Parser)]
#[command(
    name = "t1",
    version,
    about = "Agent-first pastebin CLI",
    long_about = "Create and read t1-paste pastes. Anonymous paste creation requires no login."
)]
struct Cli {
    /// Base URL of the t1-paste API.
    #[arg(
        long,
        env = "T1_API_URL",
        default_value = "https://paste.transistorone.com",
        global = true
    )]
    api_url: String,

    /// Print structured JSON instead of plain text.
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Create a paste. Reads a file, or stdin when the file is "-" or omitted.
    Paste {
        /// File to upload. Use "-" for stdin.
        file: Option<PathBuf>,

        /// Expiry such as 30m, 12h, or 7d.
        #[arg(long)]
        expires: Option<String>,

        /// public or unlisted.
        #[arg(long)]
        visibility: Option<String>,

        /// Language label for syntax highlighting.
        #[arg(long)]
        lang: Option<String>,

        /// Optional title.
        #[arg(long)]
        title: Option<String>,

        /// Password for the paste.
        #[arg(long)]
        password: Option<String>,

        /// Delete the paste after the first explicit read.
        #[arg(long)]
        burn: bool,
    },

    /// Read a paste and print its raw content.
    Get {
        /// Paste URL, slug, or /api/pastes/<slug> path.
        target: String,

        /// Password for the paste.
        #[arg(long)]
        password: Option<String>,
    },
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();
    let api_url = cli.api_url.trim_end_matches('/').to_string();

    match cli.command {
        Command::Paste {
            file,
            expires,
            visibility,
            lang,
            title,
            password,
            burn,
        } => {
            let content = read_content(file.as_ref())?;

            let mut url = Url::parse(&format!("{api_url}/api/pastes"))
                .context("invalid API URL")?;

            {
                let mut query = url.query_pairs_mut();

                if let Some(expires) = expires {
                    query.append_pair("expires", &expires);
                }
                if let Some(visibility) = visibility {
                    query.append_pair("visibility", &visibility);
                }
                if let Some(lang) = lang {
                    query.append_pair("lang", &lang);
                }
                if let Some(title) = title {
                    query.append_pair("title", &title);
                }
                if burn {
                    query.append_pair("burn", "1");
                }
            }

            let mut request = ureq::post(url.as_str())
                .set("accept", "text/plain")
                .set("content-type", "text/plain; charset=utf-8");

            if let Some(password) = password.as_deref() {
                request = request.set("x-paste-password", password);
            }

            let paste_url = send_text(request, &content)?;

            if cli.json {
                println!("{}", serde_json::to_string(&json!({ "url": paste_url }))?);
            } else {
                println!("{paste_url}");
            }
        }

        Command::Get { target, password } => {
            let slug = extract_slug(&target)?;
            let url = format!("{api_url}/api/pastes/{slug}/raw");
            let mut request = ureq::get(&url).set("accept", "text/plain");

            if let Some(password) = password.as_deref() {
                request = request.set("x-paste-password", password);
            }

            let content = send_text(request, "")?;

            if cli.json {
                println!(
                    "{}",
                    serde_json::to_string(&json!({ "slug": slug, "content": content }))?
                );
            } else {
                print!("{content}");
            }
        }
    }

    Ok(())
}

fn read_content(file: Option<&PathBuf>) -> Result<String> {
    match file {
        Some(path) if path.as_os_str() == "-" => read_stdin(),
        Some(path) => std::fs::read_to_string(path)
            .with_context(|| format!("could not read {}", path.display())),
        None => {
            if io::stdin().is_terminal() {
                Err(anyhow!(
                    "no file provided; pass a file path or pipe text through stdin"
                ))
            } else {
                read_stdin()
            }
        }
    }
}

fn read_stdin() -> Result<String> {
    let mut content = String::new();
    io::stdin()
        .read_to_string(&mut content)
        .context("could not read stdin")?;
    Ok(content)
}

fn send_text(request: ureq::Request, body: &str) -> Result<String> {
    match request.send_string(body) {
        Ok(response) => response.into_string().context("could not read response"),
        Err(ureq::Error::Status(status, response)) => {
            let body = response.into_string().unwrap_or_default();
            Err(anyhow!("HTTP {status}: {}", body.trim()))
        }
        Err(error) => Err(error).context("request failed"),
    }
}

fn extract_slug(target: &str) -> Result<String> {
    let parsed = Url::parse(target);

    if let Ok(url) = parsed {
        let mut segments = url
            .path_segments()
            .map(|segments| segments.filter(|part| !part.is_empty()).collect())
            .unwrap_or_else(Vec::new);

        if segments.first() == Some(&"api") && segments.get(1) == Some(&"pastes") {
            segments.remove(0);
            segments.remove(0);
        }

        if matches!(segments.last(), Some(&"raw" | &"meta")) {
            segments.pop();
        }

        return segments
            .pop()
            .map(str::to_string)
            .ok_or_else(|| anyhow!("could not find a paste slug in the URL"));
    }

    let slug = target.trim().trim_matches('/');

    if slug.is_empty() {
        Err(anyhow!("paste slug is empty"))
    } else {
        Ok(slug.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::extract_slug;

    #[test]
    fn extracts_slug_from_short_url() {
        assert_eq!(
            extract_slug("https://paste.transistorone.com/abc123").unwrap(),
            "abc123"
        );
    }

    #[test]
    fn extracts_slug_from_api_raw_url() {
        assert_eq!(
            extract_slug("https://paste.transistorone.com/api/pastes/abc123/raw")
                .unwrap(),
            "abc123"
        );
    }

    #[test]
    fn accepts_plain_slug() {
        assert_eq!(extract_slug("abc123").unwrap(), "abc123");
    }
}
