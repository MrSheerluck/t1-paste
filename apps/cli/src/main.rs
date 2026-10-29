use std::fs;
use std::io::{self, IsTerminal, Read};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use serde_json::json;
use url::Url;

const DEFAULT_API_URL: &str = "http://localhost:8787";
const JWT_BEARER_GRANT: &str = "urn:ietf:params:oauth:grant-type:jwt-bearer";

#[derive(Debug, Clone, Parser)]
#[command(
    name = "t1",
    version,
    about = "Agent-first pastebin CLI",
    long_about = "Create and read t1-paste pastes. Paste creation requires a registered agent. Run `t1 agent register` once through auth.md."
)]
struct Cli {
    /// Base URL of the t1-paste API. Falls back to the saved config.
    #[arg(long, env = "T1_API_URL", global = true)]
    api_url: Option<String>,

    /// Agent access token. Overrides the saved config.
    #[arg(long, env = "T1_TOKEN", global = true, hide_env_values = true)]
    token: Option<String>,

    /// Print structured JSON instead of plain text.
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Clone, Subcommand)]
enum Command {
    /// Create a paste. Reads a file, or stdin when the file is "-" or omitted.
    Paste {
        /// File to upload. Use "-" for stdin.
        file: Option<PathBuf>,

        /// Expiry such as 30m, 12h, or 7d.
        #[arg(long)]
        expires: Option<String>,

        /// public, unlisted, or private.
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

    /// Agent registration and credential management.
    Agent {
        #[command(subcommand)]
        command: AgentCommand,
    },

    /// Register this agent through auth.md and save the access token.
    Login {
        /// Optional operator bootstrap token.
        #[arg(long, env = "T1_BOOTSTRAP_TOKEN", hide_env_values = true)]
        bootstrap_token: Option<String>,
    },
}

#[derive(Debug, Clone, Subcommand)]
enum AgentCommand {
    /// Register this agent anonymously and save the access token.
    Register {
        /// Optional operator bootstrap token.
        #[arg(long, env = "T1_BOOTSTRAP_TOKEN", hide_env_values = true)]
        bootstrap_token: Option<String>,
    },

    /// Show the current agent registration.
    Status,

    /// Print the current access token.
    Token,

    /// Revoke the current access token and clear local credentials.
    Revoke,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
struct Config {
    api_url: Option<String>,
    access_token: Option<String>,
    identity_assertion: Option<String>,
    registration_id: Option<String>,
    token_expires_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct RegistrationResponse {
    registration_id: String,
    identity_assertion: String,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

#[derive(Debug, Deserialize)]
struct AgentProfile {
    registration_id: String,
    status: String,
    scopes: Vec<String>,
    created_at: String,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();
    let mut config = load_config();
    let command = cli.command.clone();

    match command {
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
            let api_url = resolve_api_url(&cli, &config);
            let token = ensure_token(&cli, &mut config)?;

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

            if let Some(token) = token.as_deref() {
                request = request.set("authorization", &format!("Bearer {token}"));
            }

            if let Some(password) = password.as_deref() {
                request = request.set("x-paste-password", password);
            }

            let paste_url = response_text(request.send_string(&content))?;

            if cli.json {
                println!("{}", serde_json::to_string(&json!({ "url": paste_url }))?);
            } else {
                println!("{paste_url}");
            }
        }

        Command::Get { target, password } => {
            let slug = extract_slug(&target)?;
            let api_url = resolve_api_url(&cli, &config);
            let token = ensure_token(&cli, &mut config)?;
            let url = format!("{api_url}/api/pastes/{slug}/raw");
            let mut request = ureq::get(&url).set("accept", "text/plain");

            if let Some(token) = token.as_deref() {
                request = request.set("authorization", &format!("Bearer {token}"));
            }

            if let Some(password) = password.as_deref() {
                request = request.set("x-paste-password", password);
            }

            let content = response_text(request.call())?;

            if cli.json {
                println!(
                    "{}",
                    serde_json::to_string(&json!({ "slug": slug, "content": content }))?
                );
            } else {
                print!("{content}");
            }
        }

        Command::Agent { command } => match command {
            AgentCommand::Register { bootstrap_token } => {
                register_agent(&cli, &mut config, bootstrap_token)?;
            }
            AgentCommand::Status => {
                agent_status(&cli, &mut config)?;
            }
            AgentCommand::Token => {
                let token = ensure_token(&cli, &mut config)?
                    .ok_or_else(|| anyhow!("no agent token; run `t1 agent register`"))?;
                println!("{token}");
            }
            AgentCommand::Revoke => {
                revoke_agent(&cli, &mut config)?;
            }
        },

        Command::Login { bootstrap_token } => {
            register_agent(&cli, &mut config, bootstrap_token)?;
        }
    }

    Ok(())
}

fn register_agent(
    cli: &Cli,
    config: &mut Config,
    bootstrap_token: Option<String>,
) -> Result<()> {
    let api_url = resolve_api_url(cli, config);
    let mut request = ureq::post(&format!("{api_url}/agent/identity"))
        .set("content-type", "application/json")
        .set("accept", "application/json");

    if let Some(token) = bootstrap_token.as_deref() {
        request = request.set("x-bootstrap-token", token);
    }

    let registration: RegistrationResponse =
        serde_json::from_str(&response_text(request.send_string("{\"type\":\"anonymous\"}"))?)
            .context("invalid agent registration response")?;

    let (access_token, expires_in) =
        exchange_assertion(&api_url, &registration.identity_assertion)?;
    let now = unix_now();

    *config = Config {
        api_url: Some(api_url),
        access_token: Some(access_token.clone()),
        identity_assertion: Some(registration.identity_assertion),
        registration_id: Some(registration.registration_id.clone()),
        token_expires_at: Some(now + expires_in as i64),
    };
    save_config(config)?;

    if cli.json {
        println!(
            "{}",
            serde_json::to_string(&json!({
                "registration_id": registration.registration_id,
                "access_token": access_token,
                "expires_in": expires_in,
            }))?
        );
    } else {
        println!("registered {}", registration.registration_id);
        println!("access token saved to {}", config_path()?.display());
    }

    Ok(())
}

fn agent_status(cli: &Cli, config: &mut Config) -> Result<()> {
    let api_url = resolve_api_url(cli, config);
    let token = ensure_token(cli, config)?
        .ok_or_else(|| anyhow!("no agent token; run `t1 agent register`"))?;

    let body = response_text(
        ureq::get(&format!("{api_url}/api/agents/me"))
            .set("accept", "application/json")
            .set("authorization", &format!("Bearer {token}"))
            .call(),
    )?;
    let profile: AgentProfile =
        serde_json::from_str(&body).context("invalid agent profile response")?;

    if cli.json {
        println!("{body}");
    } else {
        println!("registration: {}", profile.registration_id);
        println!("status:       {}", profile.status);
        println!("created:      {}", profile.created_at);
        println!("scopes:       {}", profile.scopes.join(", "));
    }

    Ok(())
}

fn revoke_agent(cli: &Cli, config: &mut Config) -> Result<()> {
    let api_url = resolve_api_url(cli, config);
    let token = ensure_token(cli, config)?
        .ok_or_else(|| anyhow!("no agent token; run `t1 agent register`"))?;
    let body = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("token", &token)
        .append_pair("token_type_hint", "access_token")
        .finish();

    response_text(
        ureq::post(&format!("{api_url}/oauth2/revoke"))
            .set("content-type", "application/x-www-form-urlencoded")
            .send_string(&body),
    )?;

    config.access_token = None;
    config.identity_assertion = None;
    config.registration_id = None;
    config.token_expires_at = None;
    save_config(config)?;

    println!("access token revoked");
    Ok(())
}

fn ensure_token(cli: &Cli, config: &mut Config) -> Result<Option<String>> {
    if let Some(token) = &cli.token {
        return Ok(Some(token.clone()));
    }

    let now = unix_now();

    if let Some(token) = &config.access_token {
        if config
            .token_expires_at
            .map(|expires_at| expires_at > now + 60)
            .unwrap_or(true)
        {
            return Ok(Some(token.clone()));
        }
    }

    if let Some(assertion) = &config.identity_assertion {
        let api_url = resolve_api_url(cli, config);
        let (token, expires_in) = exchange_assertion(&api_url, assertion)?;
        config.access_token = Some(token.clone());
        config.token_expires_at = Some(now + expires_in as i64);
        save_config(config)?;
        return Ok(Some(token));
    }

    Ok(None)
}

fn exchange_assertion(api_url: &str, assertion: &str) -> Result<(String, u64)> {
    let body = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("grant_type", JWT_BEARER_GRANT)
        .append_pair("assertion", assertion)
        .finish();

    let response = response_text(
        ureq::post(&format!("{api_url}/oauth2/token"))
            .set("content-type", "application/x-www-form-urlencoded")
            .send_string(&body),
    )?;

    let token: TokenResponse =
        serde_json::from_str(&response).context("invalid token response")?;

    Ok((token.access_token, token.expires_in))
}

fn resolve_api_url(cli: &Cli, config: &Config) -> String {
    cli.api_url
        .clone()
        .or_else(|| config.api_url.clone())
        .unwrap_or_else(|| DEFAULT_API_URL.to_string())
        .trim_end_matches('/')
        .to_string()
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

fn response_text(result: Result<ureq::Response, ureq::Error>) -> Result<String> {
    match result {
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

fn config_path() -> Result<PathBuf> {
    let dirs = ProjectDirs::from("com", "transistorone", "t1")
        .ok_or_else(|| anyhow!("could not resolve the config directory"))?;
    Ok(dirs.config_dir().join("config.json"))
}

fn load_config() -> Config {
    let Ok(path) = config_path() else {
        return Config::default();
    };

    fs::read_to_string(path)
        .ok()
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_default()
}

fn save_config(config: &Config) -> Result<()> {
    let path = config_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| anyhow!("invalid config path"))?;

    fs::create_dir_all(parent).context("could not create config directory")?;
    fs::write(&path, serde_json::to_string_pretty(config)?)
        .with_context(|| format!("could not write {}", path.display()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .context("could not secure config file permissions")?;
    }

    Ok(())
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::extract_slug;

    #[test]
    fn extracts_slug_from_short_url() {
        assert_eq!(
            extract_slug("http://localhost:8787/abc123").unwrap(),
            "abc123"
        );
    }

    #[test]
    fn extracts_slug_from_api_raw_url() {
        assert_eq!(
            extract_slug("http://localhost:8787/api/pastes/abc123/raw")
                .unwrap(),
            "abc123"
        );
    }

    #[test]
    fn accepts_plain_slug() {
        assert_eq!(extract_slug("abc123").unwrap(), "abc123");
    }
}
