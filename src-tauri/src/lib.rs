use std::{
    collections::{HashMap, HashSet},
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Stdio,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, LazyLock, Mutex,
    },
};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tokio::time::{timeout, Duration};

#[derive(Clone, Copy)]
struct TerminalRuntimeBackendDescriptor {
    kind: &'static str,
    execution_mode: &'static str,
    persistent_sessions: bool,
    streaming_output: bool,
    interactive_input: bool,
    session_resize: bool,
    alt_screen: bool,
}

const SESSIONIZED_SHELL_RUNTIME_BACKEND: TerminalRuntimeBackendDescriptor =
    TerminalRuntimeBackendDescriptor {
        kind: "sessionized-shell",
        execution_mode: "sessionized-stateless-shell",
        persistent_sessions: false,
        streaming_output: false,
        interactive_input: false,
        session_resize: false,
        alt_screen: false,
    };

const PERSISTENT_PTY_RUNTIME_BACKEND: TerminalRuntimeBackendDescriptor =
    TerminalRuntimeBackendDescriptor {
        kind: "persistent-pty",
        execution_mode: "persistent-pty-shell",
        persistent_sessions: true,
        streaming_output: true,
        interactive_input: true,
        session_resize: true,
        alt_screen: false,
    };

const ACTIVE_TERMINAL_RUNTIME_BACKEND: TerminalRuntimeBackendDescriptor =
    PERSISTENT_PTY_RUNTIME_BACKEND;

const MAX_OUTPUT_BYTES: usize = 1_048_576;
const DEFAULT_TIMEOUT_SECS: u64 = 3600;
const MAX_SESSION_EVENTS: usize = 80;
const TERMINAL_SESSION_LIVE_EVENT_NAME: &str = "terminal-session-live";
const TERMINAL_SESSION_STREAM_EVENT_NAME: &str = "terminal-session-stream";
const PTY_ROWS: u16 = 32;
const PTY_COLS: u16 = 120;
#[allow(dead_code)]
const PTY_START_MARKER_PREFIX: &str = "__SLOER_CMD_START_";
#[allow(dead_code)]
const PTY_END_MARKER_PREFIX: &str = "__SLOER_CMD_END_";
#[allow(dead_code)]
const PTY_EXIT_MARKER: &str = "__EXIT__";
#[allow(dead_code)]
const PTY_CWD_MARKER: &str = "__CWD__";
const GITHUB_RELEASES_API_URL: &str =
    "https://api.github.com/repos/nordlar49-design/SLOERSPACE-DEV/releases/latest";
const GITHUB_RELEASES_PAGE_URL: &str =
    "https://github.com/nordlar49-design/SLOERSPACE-DEV/releases/latest";
const APP_UPDATE_USER_AGENT: &str = concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION"));
const AGENT_CLI_IDS: [&str; 7] = ["claude", "codex", "gemini", "opencode", "cursor", "droid", "copilot"];

/// # Mutex Lock Ordering Invariant
///
/// To prevent deadlocks, always acquire these global mutexes in the following order:
///
/// 1. `RUNNING_PROCESSES`
/// 2. `RUNNING_PTY_COMMANDS`
/// 3. `CANCELLED_COMMANDS`
/// 4. `TERMINAL_SESSIONS`
/// 5. `PERSISTENT_PTY_SESSIONS`
/// 6. `ACTIVE_PTY_READERS`
///
/// **Rule**: Never hold a higher-numbered lock while trying to acquire a lower-numbered one.
/// Most functions only need one lock at a time. The critical paths that touch multiple
/// locks (e.g. `terminate_running_process_with_mode`) already follow this ordering.
///
/// **PTY Session Locks** (per-session, inside `PersistentPtySession`):
/// - `execution_lock` → `writer` → `reader` → `master` → `child`
/// - These are session-scoped and independent of the global ordering above.
static RUNNING_PROCESSES: LazyLock<Mutex<HashMap<String, Option<u32>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static RUNNING_PTY_COMMANDS: LazyLock<Mutex<HashMap<String, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static CANCELLED_COMMANDS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));
static SESSION_EVENT_COUNTER: AtomicU64 = AtomicU64::new(1);
static STREAM_EVENT_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalCommandResult {
    stdout: String,
    stderr: String,
    exit_code: i32,
    duration_ms: u128,
    resolved_cwd: String,
    timed_out: bool,
    cancelled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryEntry {
    name: String,
    is_dir: bool,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    os: String,
    arch: String,
    hostname: String,
    username: String,
    home_dir: String,
    shell: String,
    node_version: String,
    rust_version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppUpdateInfo {
    current_version: String,
    latest_version: String,
    has_update: bool,
    installer_available: bool,
    asset_name: Option<String>,
    asset_download_url: Option<String>,
    release_page_url: String,
    published_at: Option<String>,
    notes: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentCliResolution {
    cli: String,
    available: bool,
    resolved_path: Option<String>,
    bootstrap_command: Option<String>,
}

#[derive(Deserialize)]
struct GitHubReleaseAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    published_at: Option<String>,
    body: Option<String>,
    assets: Vec<GitHubReleaseAsset>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalCapabilities {
    desktop_runtime_available: bool,
    command_blocks: bool,
    workflows: bool,
    safe_cancellation: bool,
    persistent_sessions: bool,
    streaming_output: bool,
    interactive_input: bool,
    session_resize: bool,
    alt_screen: bool,
    remote_domains: bool,
    widgets: bool,
    execution_mode: String,
    backend_kind: String,
    shell: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RecommendedCommand {
    id: String,
    label: String,
    command: String,
    reason: String,
    category: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkingDirectoryInsight {
    cwd: String,
    project_type: String,
    package_manager: Option<String>,
    is_git_repo: bool,
    has_readme: bool,
    has_env_file: bool,
    has_docker: bool,
    recommended_commands: Vec<RecommendedCommand>,
}

#[derive(Clone)]
struct TerminalSessionRecord {
    session_id: String,
    label: Option<String>,
    session_kind: String,
    backend_kind: String,
    cwd: PathBuf,
    created_at_ms: u64,
    updated_at_ms: u64,
    last_command: Option<String>,
    last_exit_code: Option<i32>,
    last_duration_ms: Option<u64>,
    execution_count: u32,
    is_running: bool,
    active_command_id: Option<String>,
    events: Vec<TerminalSessionEvent>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionSnapshot {
    session_id: String,
    label: Option<String>,
    session_kind: String,
    backend_kind: String,
    cwd: String,
    created_at_ms: u64,
    updated_at_ms: u64,
    last_command: Option<String>,
    last_exit_code: Option<i32>,
    last_duration_ms: Option<u64>,
    execution_count: u32,
    is_running: bool,
    active_command_id: Option<String>,
    execution_mode: String,
    shell: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionEvent {
    id: String,
    session_id: String,
    label: Option<String>,
    kind: String,
    timestamp_ms: u64,
    cwd: String,
    command: Option<String>,
    command_id: Option<String>,
    exit_code: Option<i32>,
    duration_ms: Option<u64>,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionCommandResult {
    result: TerminalCommandResult,
    session_snapshot: TerminalSessionSnapshot,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionLiveEvent {
    session_snapshot: TerminalSessionSnapshot,
    event: Option<TerminalSessionEvent>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalSessionStreamEvent {
    session_id: String,
    command_id: Option<String>,
    chunk: String,
    sequence: u64,
}

struct EnsuredTerminalSessionRecord {
    snapshot: TerminalSessionSnapshot,
    event: Option<TerminalSessionEvent>,
}

#[allow(dead_code)]
struct PersistentPtySession {
    master: Mutex<Box<dyn portable_pty::MasterPty + Send>>,
    reader: Mutex<Box<dyn Read + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send>>,
    execution_lock: Mutex<()>,
}

#[allow(dead_code)]
struct PtyCommandCapture {
    stdout: String,
    exit_code: i32,
    resolved_cwd: String,
}

#[allow(dead_code)]
struct PtyStreamContext {
    app_handle: tauri::AppHandle,
    session_id: String,
    command_id: Option<String>,
}

static TERMINAL_SESSIONS: LazyLock<Mutex<HashMap<String, TerminalSessionRecord>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static PERSISTENT_PTY_SESSIONS: LazyLock<Mutex<HashMap<String, Arc<PersistentPtySession>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static ACTIVE_PTY_READERS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));

fn clean_path_display(path: &Path) -> String {
    let display = path.display().to_string();
    display.strip_prefix(r"\\?\").unwrap_or(&display).to_string()
}

fn detect_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        if let Some(profile) = std::env::var_os("USERPROFILE") {
            return Some(PathBuf::from(profile));
        }

        if let (Some(drive), Some(path)) = (std::env::var_os("HOMEDRIVE"), std::env::var_os("HOMEPATH")) {
            let mut full_path = PathBuf::from(drive);
            full_path.push(path);
            return Some(full_path);
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = std::env::var_os("HOME") {
            return Some(PathBuf::from(home));
        }
    }

    None
}

fn resolve_working_directory(raw_cwd: &str) -> Result<PathBuf, String> {
    let base_path = if raw_cwd.trim().is_empty() {
        detect_home_dir()
            .or_else(|| std::env::current_dir().ok())
            .ok_or_else(|| "Unable to determine a working directory".to_string())?
    } else {
        PathBuf::from(raw_cwd.trim())
    };

    let resolved_path = if base_path.is_absolute() {
        base_path
    } else {
        std::env::current_dir()
            .map_err(|error| error.to_string())?
            .join(base_path)
    };

    if !resolved_path.exists() {
        return Err(format!("Working directory does not exist: {}", resolved_path.display()));
    }

    if !resolved_path.is_dir() {
        return Err(format!("Working directory is not a directory: {}", resolved_path.display()));
    }

    let canonical = resolved_path.canonicalize().map_err(|error| error.to_string())?;
    let display = canonical.display().to_string();
    let cleaned = display.strip_prefix(r"\\?\").unwrap_or(&display);
    Ok(PathBuf::from(cleaned))
}

fn resolve_cd_target(command: &str, cwd: &Path) -> Option<Result<PathBuf, String>> {
    let trimmed = command.trim();
    let lowercase = trimmed.to_ascii_lowercase();

    if lowercase == "cd" {
        return Some(Ok(cwd.to_path_buf()));
    }

    if !lowercase.starts_with("cd ") {
        return None;
    }

    let mut raw_target = trimmed[2..].trim();

    if let Some(target_without_flag) = raw_target
        .strip_prefix("/d ")
        .or_else(|| raw_target.strip_prefix("/D "))
    {
        raw_target = target_without_flag.trim();
    }

    let raw_target = raw_target.trim_matches('"');

    if raw_target.is_empty() {
        return Some(Ok(cwd.to_path_buf()));
    }

    let next_path = if raw_target == "~" {
        detect_home_dir().unwrap_or_else(|| cwd.to_path_buf())
    } else {
        let candidate = PathBuf::from(raw_target);

        if candidate.is_absolute() {
            candidate
        } else {
            cwd.join(candidate)
        }
    };

    Some(
        next_path
            .canonicalize()
            .map_err(|error| error.to_string())
            .and_then(|path| {
                if path.is_dir() {
                    Ok(path)
                } else {
                    Err(format!("Target directory is not valid: {}", path.display()))
                }
            }),
    )
}

#[cfg(target_os = "windows")]
#[derive(Clone, Copy)]
enum WindowsShell {
    Pwsh,
    PowerShell,
    Cmd,
}

#[cfg(target_os = "windows")]
static WINDOWS_SHELL: LazyLock<WindowsShell> = LazyLock::new(detect_windows_shell);

#[cfg(target_os = "windows")]
fn command_exists(program: &str) -> bool {
    std::process::Command::new("where")
        .arg(program)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn detect_windows_shell() -> WindowsShell {
    if command_exists("pwsh.exe") || command_exists("pwsh") {
        WindowsShell::Pwsh
    } else if command_exists("powershell.exe") || command_exists("powershell") {
        WindowsShell::PowerShell
    } else {
        WindowsShell::Cmd
    }
}

#[cfg(target_os = "windows")]
fn windows_shell_label() -> &'static str {
    match *WINDOWS_SHELL {
        WindowsShell::Pwsh => "PowerShell 7",
        WindowsShell::PowerShell => "PowerShell",
        WindowsShell::Cmd => "Command Prompt",
    }
}

#[cfg(target_os = "windows")]
fn normalize_shell_command(command: &str) -> String {
    let trimmed = command.trim();
    let lowercase = trimmed.to_ascii_lowercase();

    match *WINDOWS_SHELL {
        WindowsShell::Cmd => {
            if lowercase == "ls" {
                return "dir".to_string();
            }

            if lowercase == "pwd" {
                return "cd".to_string();
            }
        }
        WindowsShell::Pwsh | WindowsShell::PowerShell => {
            if lowercase == "pwd" {
                return "(Get-Location).Path".to_string();
            }

            if lowercase == "env" {
                return "Get-ChildItem Env:".to_string();
            }

            if let Some(target) = trimmed.strip_prefix("open ").or_else(|| trimmed.strip_prefix("Open ")) {
                let escaped = target.trim().replace('"', "`\"");
                if !escaped.is_empty() {
                    return format!("Invoke-Item \"{}\"", escaped);
                }
            }
        }
    }

    trimmed.to_string()
}

#[cfg(not(target_os = "windows"))]
fn normalize_shell_command(command: &str) -> String {
    command.trim().to_string()
}

#[cfg(target_os = "windows")]
fn current_shell_label() -> String {
    windows_shell_label().to_string()
}

#[cfg(not(target_os = "windows"))]
fn current_shell_label() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "sh".into())
}

fn is_supported_agent_cli(cli: &str) -> bool {
    AGENT_CLI_IDS.contains(&cli)
}

#[cfg(target_os = "windows")]
fn resolve_command_path(program: &str) -> Option<String> {
    use std::os::windows::process::CommandExt;

    std::process::Command::new("where")
        .arg(program)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(0x08000000)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| {
            String::from_utf8_lossy(&output.stdout)
                .lines()
                .map(str::trim)
                .find(|line| !line.is_empty())
                .map(|line| line.to_string())
        })
}

#[cfg(not(target_os = "windows"))]
fn resolve_command_path(program: &str) -> Option<String> {
    std::process::Command::new("sh")
        .args(["-lc", &format!("command -v {}", program)])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| {
            let resolved = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if resolved.is_empty() {
                None
            } else {
                Some(resolved)
            }
        })
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn build_agent_cli_bootstrap_command(resolved_path: &str) -> String {
    let escaped = resolved_path.replace('"', "`\"");

    match *WINDOWS_SHELL {
        WindowsShell::Pwsh | WindowsShell::PowerShell => format!("& \"{}\"", escaped),
        WindowsShell::Cmd => format!("\"{}\"", resolved_path),
    }
}

#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn build_agent_cli_bootstrap_command(resolved_path: &str) -> String {
    format!("'{}'", resolved_path.replace('\'', "'\"'\"'"))
}

fn resolve_agent_cli(cli: &str) -> AgentCliResolution {
    if !is_supported_agent_cli(cli) {
        return AgentCliResolution {
            cli: cli.to_string(),
            available: false,
            resolved_path: None,
            bootstrap_command: None,
        };
    }

    let resolved_path = resolve_command_path(cli);
    let available = resolved_path.is_some();

    AgentCliResolution {
        cli: cli.to_string(),
        available,
        resolved_path,
        bootstrap_command: Some(cli.to_string()),
    }
}

fn normalize_release_version(value: &str) -> String {
    value.trim().trim_start_matches('v').trim_start_matches('V').to_string()
}

fn sanitize_update_filename(value: &str) -> String {
    let cleaned: String = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '-'
            }
        })
        .collect();

    if cleaned.is_empty() {
        "sloerspace-update-installer.exe".to_string()
    } else {
        cleaned
    }
}

fn select_windows_installer_asset(assets: &[GitHubReleaseAsset]) -> Option<&GitHubReleaseAsset> {
    assets
        .iter()
        .find(|asset| asset.name.to_ascii_lowercase().ends_with(".msi"))
        .or_else(|| {
            assets
                .iter()
                .find(|asset| asset.name.to_ascii_lowercase().ends_with(".exe"))
        })
}

async fn fetch_latest_github_release() -> Result<GitHubRelease, String> {
    let client = reqwest::Client::builder()
        .user_agent(APP_UPDATE_USER_AGENT)
        .build()
        .map_err(|error| error.to_string())?;

    client
        .get(GITHUB_RELEASES_API_URL)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<GitHubRelease>()
        .await
        .map_err(|error| error.to_string())
}

fn build_app_update_info(release: GitHubRelease) -> AppUpdateInfo {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let latest_version = normalize_release_version(&release.tag_name);
    let installer_asset = select_windows_installer_asset(&release.assets);
    let installer_available = installer_asset.is_some();
    let has_update = semver::Version::parse(&latest_version)
        .ok()
        .and_then(|latest| {
            semver::Version::parse(&current_version)
                .ok()
                .map(|current| latest > current)
        })
        .unwrap_or(false);

    AppUpdateInfo {
        current_version,
        latest_version,
        has_update,
        installer_available,
        asset_name: installer_asset.map(|asset| asset.name.clone()),
        asset_download_url: installer_asset.map(|asset| asset.browser_download_url.clone()),
        release_page_url: if release.html_url.trim().is_empty() {
            GITHUB_RELEASES_PAGE_URL.to_string()
        } else {
            release.html_url
        },
        published_at: release.published_at,
        notes: release.body,
    }
}

#[cfg(target_os = "windows")]
fn spawn_detached_windows(program: &str, args: &[&str]) -> Result<(), String> {
    use std::os::windows::process::CommandExt;

    std::process::Command::new(program)
        .args(args)
        .creation_flags(0x08000000)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
async fn launch_downloaded_installer(installer_path: &Path) -> Result<(), String> {
    let installer = installer_path.to_string_lossy().to_string();
    let is_msi = installer_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("msi"))
        .unwrap_or(false);

    if is_msi {
        spawn_detached_windows("msiexec", &["/i", installer.as_str()])
    } else {
        spawn_detached_windows("cmd", &["/C", "start", "", installer.as_str()])
    }
}

#[cfg(not(target_os = "windows"))]
async fn launch_downloaded_installer(_installer_path: &Path) -> Result<(), String> {
    Err("Automatic update installation is only supported on Windows builds.".to_string())
}

fn current_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
        .unwrap_or(0)
}

fn terminal_runtime_backend_for_kind(kind: &str) -> TerminalRuntimeBackendDescriptor {
    match kind {
        "persistent-pty" => PERSISTENT_PTY_RUNTIME_BACKEND,
        "sessionized-shell" => SESSIONIZED_SHELL_RUNTIME_BACKEND,
        _ => ACTIVE_TERMINAL_RUNTIME_BACKEND,
    }
}

fn terminal_backend_kind() -> &'static str {
    ACTIVE_TERMINAL_RUNTIME_BACKEND.kind
}

fn truncate_utf8_to_byte_boundary(value: &mut String, max_bytes: usize) {
    if value.len() <= max_bytes {
        return;
    }

    let mut boundary = max_bytes;
    while boundary > 0 && !value.is_char_boundary(boundary) {
        boundary -= 1;
    }
    value.truncate(boundary);
}

fn truncate_terminal_output(mut value: String, suffix: &str) -> String {
    if value.len() > MAX_OUTPUT_BYTES {
        truncate_utf8_to_byte_boundary(&mut value, MAX_OUTPUT_BYTES);
        value.push_str(suffix);
    }
    value
}

#[allow(dead_code)]
fn append_terminal_output(target: &mut String, chunk: &str, truncated: &mut bool) {
    if *truncated || chunk.is_empty() {
        return;
    }

    target.push_str(chunk);
    if target.len() > MAX_OUTPUT_BYTES {
        truncate_utf8_to_byte_boundary(target, MAX_OUTPUT_BYTES);
        target.push_str("\n\n[Output truncated at 1MB]");
        *truncated = true;
    }
}

fn next_terminal_stream_sequence() -> u64 {
    STREAM_EVENT_COUNTER.fetch_add(1, Ordering::Relaxed)
}

#[allow(dead_code)]
fn next_pty_marker_token(command_id: Option<&str>) -> String {
    let raw = command_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .unwrap_or_else(|| format!("pty-{}", SESSION_EVENT_COUNTER.fetch_add(1, Ordering::Relaxed)));

    raw.chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

#[allow(dead_code)]
fn pty_start_marker(marker_token: &str) -> String {
    format!("{}{}", PTY_START_MARKER_PREFIX, marker_token)
}

#[allow(dead_code)]
fn pty_end_marker_prefix(marker_token: &str) -> String {
    format!("{}{}{}", PTY_END_MARKER_PREFIX, marker_token, PTY_EXIT_MARKER)
}

#[allow(dead_code)]
fn parse_pty_end_marker_line(line: &str, marker_token: &str) -> Option<(i32, String)> {
    let remainder = line.strip_prefix(&pty_end_marker_prefix(marker_token))?;
    let (exit_code_raw, cwd_raw) = remainder.split_once(PTY_CWD_MARKER)?;
    let exit_code = exit_code_raw.trim().parse::<i32>().ok()?;

    Some((exit_code, cwd_raw.trim().to_string()))
}

#[cfg(target_os = "windows")]
fn current_pty_command_builder() -> CommandBuilder {
    match *WINDOWS_SHELL {
        WindowsShell::Pwsh => {
            let mut command = CommandBuilder::new("pwsh");
            command.arg("-NoLogo");
            command.arg("-NoExit");
            command
        }
        WindowsShell::PowerShell => {
            let mut command = CommandBuilder::new("powershell");
            command.arg("-NoLogo");
            command.arg("-NoExit");
            command
        }
        WindowsShell::Cmd => {
            let mut command = CommandBuilder::new("cmd");
            command.arg("/Q");
            command
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn current_pty_command_builder() -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "sh".to_string());
    CommandBuilder::new(shell)
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn build_pty_wrapped_command(command: &str, marker_token: &str) -> String {
    let normalized = normalize_shell_command(command);
    let start_marker = pty_start_marker(marker_token);
    let end_marker_prefix = pty_end_marker_prefix(marker_token);

    match *WINDOWS_SHELL {
        WindowsShell::Pwsh | WindowsShell::PowerShell => format!(
            "Write-Output '{}'\r\n$global:LASTEXITCODE = $null\r\n{}\r\n$__sloer_exit = if ($null -ne $LASTEXITCODE) {{ [int]$LASTEXITCODE }} elseif ($?) {{ 0 }} else {{ 1 }}\r\n$__sloer_cwd = (Get-Location).Path\r\nWrite-Output ('{}' + $__sloer_exit + '{}' + $__sloer_cwd)\r\n",
            start_marker, normalized, end_marker_prefix, PTY_CWD_MARKER
        ),
        WindowsShell::Cmd => format!(
            "echo {}\r\n{}\r\nset \"__SLOER_EXIT__=%ERRORLEVEL%\"\r\necho {}%__SLOER_EXIT__{}%CD%\r\n",
            start_marker, normalized, end_marker_prefix, PTY_CWD_MARKER
        ),
    }
}

#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn build_pty_wrapped_command(command: &str, marker_token: &str) -> String {
    let normalized = normalize_shell_command(command);
    let start_marker = pty_start_marker(marker_token);
    let end_marker_prefix = pty_end_marker_prefix(marker_token);

    format!(
        "printf '%s\\n' '{}'\n{}\n__sloer_exit=$?\n__sloer_cwd=\"$(pwd)\"\nprintf '%s\\n' \"{}${{__sloer_exit}}{}${{__sloer_cwd}}\"\n",
        start_marker, normalized, end_marker_prefix, PTY_CWD_MARKER
    )
}

fn spawn_persistent_pty_session(cwd: &Path) -> Result<Arc<PersistentPtySession>, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: PTY_ROWS,
            cols: PTY_COLS,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string())?;
    let portable_pty::PtyPair { master, slave } = pair;
    let mut command = current_pty_command_builder();
    command.cwd(cwd);
    command.env("TERM", "xterm-256color");
    command.env("NO_COLOR", "0");
    command.env("PSREADLINE_PREDICTIONSOURCE", "None");

    let child = slave
        .spawn_command(command)
        .map_err(|error| error.to_string())?;
    let reader = master.try_clone_reader().map_err(|error| error.to_string())?;
    let writer = master.take_writer().map_err(|error| error.to_string())?;

    Ok(Arc::new(PersistentPtySession {
        master: Mutex::new(master),
        reader: Mutex::new(reader),
        writer: Mutex::new(writer),
        child: Mutex::new(child),
        execution_lock: Mutex::new(()),
    }))
}

fn remove_persistent_pty_session(session_id: &str) -> Option<Arc<PersistentPtySession>> {
    PERSISTENT_PTY_SESSIONS
        .lock()
        .ok()
        .and_then(|mut sessions| sessions.remove(session_id))
}

fn terminate_persistent_pty_session(session: &PersistentPtySession) -> Result<(), String> {
    let mut child = session.child.lock().map_err(|error| error.to_string())?;
    child.kill().map_err(|error| error.to_string())
}

fn ensure_persistent_pty_session(session_id: &str, cwd: &Path) -> Result<Arc<PersistentPtySession>, String> {
    if let Some(existing_session) = PERSISTENT_PTY_SESSIONS
        .lock()
        .map_err(|error| error.to_string())?
        .get(session_id)
        .cloned()
    {
        return Ok(existing_session);
    }

    let session = spawn_persistent_pty_session(cwd)?;
    let mut sessions = PERSISTENT_PTY_SESSIONS.lock().map_err(|error| error.to_string())?;

    Ok(sessions
        .entry(session_id.to_string())
        .or_insert_with(|| session.clone())
        .clone())
}

fn start_pty_background_reader(
    app_handle: &tauri::AppHandle,
    session_id: &str,
    session: &Arc<PersistentPtySession>,
) {
    let already_active = ACTIVE_PTY_READERS
        .lock()
        .map(|mut set| !set.insert(session_id.to_string()))
        .unwrap_or(true);

    if already_active {
        return;
    }

    let handle = app_handle.clone();
    let sid = session_id.to_string();
    let reader_session = session.clone();

    std::thread::spawn(move || {
        let mut buffer = [0u8; 16384];
        loop {
            let read_count = {
                let mut reader = match reader_session.reader.lock() {
                    Ok(r) => r,
                    Err(_) => break,
                };
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => n,
                    Err(_) => break,
                }
            };

            let chunk = String::from_utf8_lossy(&buffer[..read_count]).to_string();
            emit_terminal_session_stream(
                &handle,
                TerminalSessionStreamEvent {
                    session_id: sid.clone(),
                    command_id: None,
                    chunk,
                    sequence: next_terminal_stream_sequence(),
                },
            );

            if read_count >= 8192 {
                std::thread::sleep(std::time::Duration::from_millis(1));
            }
        }

        if let Ok(mut set) = ACTIVE_PTY_READERS.lock() {
            set.remove(&sid);
        }
    });
}

fn respawn_persistent_pty_session(session_id: &str, cwd: &Path) -> Result<Arc<PersistentPtySession>, String> {
    if let Some(existing_session) = remove_persistent_pty_session(session_id) {
        let _ = terminate_persistent_pty_session(&existing_session);
    }

    let session = spawn_persistent_pty_session(cwd)?;
    let mut sessions = PERSISTENT_PTY_SESSIONS.lock().map_err(|error| error.to_string())?;
    sessions.insert(session_id.to_string(), session.clone());
    Ok(session)
}

#[allow(dead_code)]
fn execute_persistent_pty_command_blocking(
    session: Arc<PersistentPtySession>,
    wrapped_command: String,
    marker_token: String,
    stream_context: Option<PtyStreamContext>,
) -> Result<PtyCommandCapture, String> {
    let _execution_guard = session
        .execution_lock
        .lock()
        .map_err(|error| error.to_string())?;

    {
        let mut writer = session.writer.lock().map_err(|error| error.to_string())?;
        writer
            .write_all(wrapped_command.as_bytes())
            .map_err(|error| error.to_string())?;
        writer.flush().map_err(|error| error.to_string())?;
    }

    let start_marker = pty_start_marker(&marker_token);
    let end_marker_prefix = pty_end_marker_prefix(&marker_token);
    let mut captured_output = String::new();
    let mut scratch = String::new();
    let mut buffer = [0u8; 4096];
    let mut started = false;
    let mut output_truncated = false;

    loop {
        let read_count = {
            let mut reader = session.reader.lock().map_err(|error| error.to_string())?;
            reader.read(&mut buffer).map_err(|error| error.to_string())?
        };

        if read_count == 0 {
            return Err("Persistent PTY session ended unexpectedly".to_string());
        }

        scratch.push_str(&String::from_utf8_lossy(&buffer[..read_count]));

        if !started {
            if let Some(start_index) = scratch.find(&start_marker) {
                scratch = scratch[start_index + start_marker.len()..].to_string();
                scratch = scratch
                    .trim_start_matches(['\r', '\n'])
                    .to_string();
                started = true;
            } else {
                let keep_tail = start_marker.len().max(64);
                if scratch.len() > keep_tail {
                    scratch = scratch[scratch.len() - keep_tail..].to_string();
                }
                continue;
            }
        }

        if let Some(end_index) = scratch.find(&end_marker_prefix) {
            emit_terminal_session_stream_chunk(stream_context.as_ref(), &scratch[..end_index]);
            append_terminal_output(&mut captured_output, &scratch[..end_index], &mut output_truncated);
            let line_remainder = &scratch[end_index..];

            if let Some(line_end_index) = line_remainder.find('\n') {
                let marker_line = line_remainder[..line_end_index].trim_end_matches('\r');
                if let Some((exit_code, resolved_cwd)) =
                    parse_pty_end_marker_line(marker_line, &marker_token)
                {
                    return Ok(PtyCommandCapture {
                        stdout: captured_output
                            .trim_end_matches(['\r', '\n'])
                            .to_string(),
                        exit_code,
                        resolved_cwd,
                    });
                }

                return Err("Failed to parse PTY command completion marker".to_string());
            }

            scratch = line_remainder.to_string();
            continue;
        }

        let keep_tail = end_marker_prefix.len().max(64);
        if scratch.len() > keep_tail {
            let flush_len = scratch.len() - keep_tail;
            emit_terminal_session_stream_chunk(stream_context.as_ref(), &scratch[..flush_len]);
            append_terminal_output(&mut captured_output, &scratch[..flush_len], &mut output_truncated);
            scratch = scratch[flush_len..].to_string();
        }
    }
}

fn session_snapshot_from_record(record: &TerminalSessionRecord) -> TerminalSessionSnapshot {
    TerminalSessionSnapshot {
        session_id: record.session_id.clone(),
        label: record.label.clone(),
        session_kind: record.session_kind.clone(),
        backend_kind: record.backend_kind.clone(),
        cwd: clean_path_display(&record.cwd),
        created_at_ms: record.created_at_ms,
        updated_at_ms: record.updated_at_ms,
        last_command: record.last_command.clone(),
        last_exit_code: record.last_exit_code,
        last_duration_ms: record.last_duration_ms,
        execution_count: record.execution_count,
        is_running: record.is_running,
        active_command_id: record.active_command_id.clone(),
        execution_mode: terminal_runtime_backend_for_kind(&record.backend_kind)
            .execution_mode
            .to_string(),
        shell: current_shell_label(),
    }
}

fn next_session_event_id() -> String {
    format!("evt-{}", SESSION_EVENT_COUNTER.fetch_add(1, Ordering::Relaxed))
}

fn push_session_event(
    record: &mut TerminalSessionRecord,
    kind: &str,
    message: String,
    command: Option<String>,
    command_id: Option<String>,
    exit_code: Option<i32>,
    duration_ms: Option<u64>,
) -> TerminalSessionEvent {
    let next_event = TerminalSessionEvent {
        id: next_session_event_id(),
        session_id: record.session_id.clone(),
        label: record.label.clone(),
        kind: kind.to_string(),
        timestamp_ms: current_timestamp_ms(),
        cwd: clean_path_display(&record.cwd),
        command,
        command_id,
        exit_code,
        duration_ms,
        message,
    };
    record.events.push(next_event.clone());

    if record.events.len() > MAX_SESSION_EVENTS {
        let overflow = record.events.len() - MAX_SESSION_EVENTS;
        record.events.drain(0..overflow);
    }

    next_event
}

fn emit_terminal_session_live(emitter: &tauri::AppHandle, payload: TerminalSessionLiveEvent) {
    let _ = emitter.emit(TERMINAL_SESSION_LIVE_EVENT_NAME, payload);
}

fn emit_terminal_session_stream(emitter: &tauri::AppHandle, payload: TerminalSessionStreamEvent) {
    let _ = emitter.emit(TERMINAL_SESSION_STREAM_EVENT_NAME, payload);
}

#[allow(dead_code)]
fn emit_terminal_session_stream_chunk(stream_context: Option<&PtyStreamContext>, chunk: &str) {
    if chunk.is_empty() {
        return;
    }

    if let Some(context) = stream_context {
        emit_terminal_session_stream(
            &context.app_handle,
            TerminalSessionStreamEvent {
                session_id: context.session_id.clone(),
                command_id: context.command_id.clone(),
                chunk: chunk.to_string(),
                sequence: next_terminal_stream_sequence(),
            },
        );
    }
}

fn terminal_session_live_payload(
    snapshot: TerminalSessionSnapshot,
    event: Option<TerminalSessionEvent>,
) -> TerminalSessionLiveEvent {
    TerminalSessionLiveEvent {
        session_snapshot: snapshot,
        event,
    }
}

fn ensure_runtime_session_for_backend(
    backend_kind: &str,
    session_id: &str,
    cwd: &Path,
    respawn: bool,
) -> Result<(), String> {
    match terminal_runtime_backend_for_kind(backend_kind).kind {
        "persistent-pty" => {
            if respawn {
                respawn_persistent_pty_session(session_id, cwd)?;
            } else {
                ensure_persistent_pty_session(session_id, cwd)?;
            }
            Ok(())
        }
        "sessionized-shell" => Ok(()),
        other => Err(format!("Unsupported terminal runtime backend: {}", other)),
    }
}

fn ensure_terminal_session_record(
    session_id: &str,
    cwd: &str,
    label: Option<String>,
    session_kind: Option<String>,
) -> Result<EnsuredTerminalSessionRecord, String> {
    let resolved_cwd = resolve_working_directory(cwd)?;
    let now = current_timestamp_ms();
    let next_label = label.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });
    let next_kind = session_kind
        .and_then(|value| {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        })
        .unwrap_or_else(|| "local".to_string());

    let requires_runtime_respawn = {
        let sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
        sessions
            .get(session_id)
            .map(|record| record.cwd != resolved_cwd)
            .unwrap_or(false)
    };

    ensure_runtime_session_for_backend(
        terminal_backend_kind(),
        session_id,
        &resolved_cwd,
        requires_runtime_respawn,
    )?;

    let mut sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;

    if let Some(record) = sessions.get_mut(session_id) {
        let cwd_changed = record.cwd != resolved_cwd;
        record.cwd = resolved_cwd.clone();
        record.updated_at_ms = now;
        record.backend_kind = terminal_backend_kind().to_string();
        if let Some(label) = next_label.clone() {
            record.label = Some(label);
        }
        record.session_kind = next_kind.clone();
        let next_event = if cwd_changed {
            Some(push_session_event(
                record,
                "cwd-changed",
                format!("Working directory changed to {}", clean_path_display(&resolved_cwd)),
                None,
                None,
                None,
                None,
            ))
        } else {
            None
        };
        return Ok(EnsuredTerminalSessionRecord {
            snapshot: session_snapshot_from_record(record),
            event: next_event,
        });
    }

    let mut record = TerminalSessionRecord {
        session_id: session_id.to_string(),
        label: next_label,
        session_kind: next_kind,
        backend_kind: terminal_backend_kind().to_string(),
        cwd: resolved_cwd.clone(),
        created_at_ms: now,
        updated_at_ms: now,
        last_command: None,
        last_exit_code: None,
        last_duration_ms: None,
        execution_count: 0,
        is_running: false,
        active_command_id: None,
        events: Vec::new(),
    };
    let next_event = push_session_event(
        &mut record,
        "session-created",
        format!("Session ready in {}", clean_path_display(&resolved_cwd)),
        None,
        None,
        None,
        None,
    );
    let snapshot = session_snapshot_from_record(&record);
    sessions.insert(session_id.to_string(), record);

    Ok(EnsuredTerminalSessionRecord {
        snapshot,
        event: Some(next_event),
    })
}

async fn terminate_running_process_with_mode(
    command_id: &str,
    mark_cancelled: bool,
) -> Result<bool, String> {
    let pty_session_id = {
        let mut map = RUNNING_PTY_COMMANDS.lock().map_err(|error| error.to_string())?;
        map.remove(command_id)
    };

    if let Some(session_id) = pty_session_id {
        if mark_cancelled {
            if let Ok(mut cancelled_commands) = CANCELLED_COMMANDS.lock() {
                cancelled_commands.insert(command_id.to_string());
            }
        }

        if let Some(session) = remove_persistent_pty_session(&session_id) {
            let _ = terminate_persistent_pty_session(&session);
        }

        return Ok(true);
    }

    let pid = {
        let map = RUNNING_PROCESSES.lock().map_err(|e| e.to_string())?;
        map.get(command_id).and_then(|p| *p)
    };

    if let Some(pid) = pid {
        if mark_cancelled {
            if let Ok(mut cancelled_commands) = CANCELLED_COMMANDS.lock() {
                cancelled_commands.insert(command_id.to_string());
            }
        }

        #[cfg(target_os = "windows")]
        {
            let child = spawn_silent("taskkill", &["/F", "/T", "/PID", &pid.to_string()])?;
            let _ = child.wait_with_output().await;
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = tokio::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .output()
                .await;
        }

        if let Ok(mut map) = RUNNING_PROCESSES.lock() {
            map.remove(command_id);
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

async fn terminate_running_process(command_id: &str) -> Result<bool, String> {
    terminate_running_process_with_mode(command_id, true).await
}

fn push_recommended_command(
    commands: &mut Vec<RecommendedCommand>,
    id: &str,
    label: &str,
    command: &str,
    reason: &str,
    category: &str,
) {
    if commands.iter().any(|entry| entry.command == command) {
        return;
    }

    commands.push(RecommendedCommand {
        id: id.to_string(),
        label: label.to_string(),
        command: command.to_string(),
        reason: reason.to_string(),
        category: category.to_string(),
    });
}

fn read_package_scripts(package_json_path: &Path) -> Vec<String> {
    std::fs::read_to_string(package_json_path)
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .and_then(|value| {
            value
                .get("scripts")
                .and_then(|scripts| scripts.as_object())
                .map(|scripts| scripts.keys().cloned().collect())
        })
        .unwrap_or_default()
}

#[tauri::command]
fn get_terminal_capabilities() -> TerminalCapabilities {
    let backend = ACTIVE_TERMINAL_RUNTIME_BACKEND;

    TerminalCapabilities {
        desktop_runtime_available: true,
        command_blocks: true,
        workflows: true,
        safe_cancellation: true,
        persistent_sessions: backend.persistent_sessions,
        streaming_output: backend.streaming_output,
        interactive_input: backend.interactive_input,
        session_resize: backend.session_resize,
        alt_screen: backend.alt_screen,
        remote_domains: false,
        widgets: false,
        execution_mode: backend.execution_mode.to_string(),
        backend_kind: backend.kind.to_string(),
        shell: current_shell_label(),
    }
}

#[tauri::command]
fn inspect_working_directory(cwd: String) -> Result<WorkingDirectoryInsight, String> {
    let resolved = resolve_working_directory(&cwd)?;
    let cwd_display = clean_path_display(&resolved);
    let package_json_path = resolved.join("package.json");
    let has_package_json = package_json_path.is_file();
    let has_cargo = resolved.join("Cargo.toml").is_file();
    let has_pyproject = resolved.join("pyproject.toml").is_file();
    let has_requirements = resolved.join("requirements.txt").is_file();
    let has_go_mod = resolved.join("go.mod").is_file();
    let has_readme = ["README.md", "README", "readme.md"]
        .iter()
        .any(|name| resolved.join(name).is_file());
    let has_env_file = [".env", ".env.local", ".env.development", ".env.production"]
        .iter()
        .any(|name| resolved.join(name).is_file());
    let has_dockerfile = resolved.join("Dockerfile").is_file();
    let has_compose = [
        "docker-compose.yml",
        "docker-compose.yaml",
        "compose.yml",
        "compose.yaml",
    ]
    .iter()
    .any(|name| resolved.join(name).is_file());
    let has_docker = has_dockerfile || has_compose;
    let is_git_repo = resolved.join(".git").exists();
    let package_manager = if resolved.join("pnpm-lock.yaml").is_file() {
        Some("pnpm".to_string())
    } else if resolved.join("yarn.lock").is_file() {
        Some("yarn".to_string())
    } else if resolved.join("bun.lockb").exists() || resolved.join("bun.lock").exists() {
        Some("bun".to_string())
    } else if has_package_json {
        Some("npm".to_string())
    } else {
        None
    };

    let project_type = if has_cargo {
        "rust"
    } else if has_package_json {
        "node"
    } else if has_pyproject || has_requirements {
        "python"
    } else if has_go_mod {
        "go"
    } else if has_docker {
        "containers"
    } else {
        "generic"
    };

    let mut recommended_commands = Vec::new();

    push_recommended_command(
        &mut recommended_commands,
        "cwd",
        "Print working directory",
        "pwd",
        "Confirm the active workspace root before you run project commands.",
        "navigation",
    );
    push_recommended_command(
        &mut recommended_commands,
        "list",
        "List files",
        "ls",
        "Inspect the current directory quickly.",
        "navigation",
    );

    if is_git_repo {
        push_recommended_command(
            &mut recommended_commands,
            "git-status",
            "Git status",
            "git status",
            "Check working tree, branch state, and staged changes.",
            "git",
        );
        push_recommended_command(
            &mut recommended_commands,
            "git-diff-stat",
            "Git diff summary",
            "git diff --stat",
            "Review the scope of file changes before deeper inspection.",
            "git",
        );
        push_recommended_command(
            &mut recommended_commands,
            "git-log",
            "Recent commits",
            "git log --oneline -10",
            "See the latest commit context in this repo.",
            "git",
        );
    }

    if has_package_json {
        let package_scripts = read_package_scripts(&package_json_path);
        let install_command = match package_manager.as_deref() {
            Some("pnpm") => "pnpm install",
            Some("yarn") => "yarn install",
            Some("bun") => "bun install",
            _ => "npm install",
        };
        let dev_command = match package_manager.as_deref() {
            Some("pnpm") => "pnpm dev",
            Some("yarn") => "yarn dev",
            Some("bun") => "bun run dev",
            _ => "npm run dev",
        };
        let build_command = match package_manager.as_deref() {
            Some("pnpm") => "pnpm build",
            Some("yarn") => "yarn build",
            Some("bun") => "bun run build",
            _ => "npm run build",
        };
        let test_command = match package_manager.as_deref() {
            Some("pnpm") => "pnpm test",
            Some("yarn") => "yarn test",
            Some("bun") => "bun test",
            _ => "npm test",
        };

        push_recommended_command(
            &mut recommended_commands,
            "node-install",
            "Install dependencies",
            install_command,
            "Restore project dependencies for this JavaScript or TypeScript workspace.",
            "project",
        );

        if package_scripts.iter().any(|script| script == "dev") {
            push_recommended_command(
                &mut recommended_commands,
                "node-dev",
                "Start dev server",
                dev_command,
                "Launch the development workflow declared by the project.",
                "project",
            );
        }

        if package_scripts.iter().any(|script| script == "build") {
            push_recommended_command(
                &mut recommended_commands,
                "node-build",
                "Build project",
                build_command,
                "Run the production build pipeline for this repo.",
                "project",
            );
        }

        if package_scripts.iter().any(|script| script == "test") {
            push_recommended_command(
                &mut recommended_commands,
                "node-test",
                "Run test suite",
                test_command,
                "Execute the project's configured test command.",
                "project",
            );
        }
    }

    if has_cargo {
        push_recommended_command(
            &mut recommended_commands,
            "cargo-check",
            "Cargo check",
            "cargo check",
            "Validate the Rust workspace quickly without building full artifacts.",
            "project",
        );
        push_recommended_command(
            &mut recommended_commands,
            "cargo-test",
            "Cargo test",
            "cargo test",
            "Run the Rust test suite for this workspace.",
            "project",
        );
        if resolved.join("src").join("main.rs").is_file() {
            push_recommended_command(
                &mut recommended_commands,
                "cargo-run",
                "Cargo run",
                "cargo run",
                "Start the main Rust binary for this workspace.",
                "project",
            );
        }
    }

    if has_pyproject || has_requirements {
        if has_requirements {
            push_recommended_command(
                &mut recommended_commands,
                "python-install",
                "Install requirements",
                "python -m pip install -r requirements.txt",
                "Install Python dependencies from the repo requirements file.",
                "project",
            );
        }
        push_recommended_command(
            &mut recommended_commands,
            "python-test",
            "Run pytest",
            "python -m pytest",
            "Execute the Python test suite if present.",
            "project",
        );
    }

    if has_go_mod {
        push_recommended_command(
            &mut recommended_commands,
            "go-test",
            "Go test",
            "go test ./...",
            "Run tests across the Go module.",
            "project",
        );
        push_recommended_command(
            &mut recommended_commands,
            "go-run",
            "Go run",
            "go run .",
            "Run the current Go module entrypoint.",
            "project",
        );
    }

    if has_compose {
        push_recommended_command(
            &mut recommended_commands,
            "compose-services",
            "Compose services",
            "docker compose config --services",
            "Inspect the services defined in the compose stack.",
            "containers",
        );
        push_recommended_command(
            &mut recommended_commands,
            "compose-ps",
            "Compose status",
            "docker compose ps",
            "Check the runtime status of the compose stack.",
            "containers",
        );
    } else if has_dockerfile {
        push_recommended_command(
            &mut recommended_commands,
            "docker-build",
            "Docker build",
            "docker build .",
            "Build the local Docker image from this workspace.",
            "containers",
        );
    }

    Ok(WorkingDirectoryInsight {
        cwd: cwd_display,
        project_type: project_type.to_string(),
        package_manager,
        is_git_repo,
        has_readme,
        has_env_file,
        has_docker,
        recommended_commands,
    })
}

#[tauri::command]
fn get_default_workdir() -> Result<String, String> {
    resolve_working_directory("").map(|path| clean_path_display(&path))
}

#[cfg(target_os = "windows")]
fn spawn_shell(cmd: &str, cwd: &Path) -> Result<tokio::process::Child, String> {
    let mut command = match *WINDOWS_SHELL {
        WindowsShell::Pwsh => {
            let mut process = tokio::process::Command::new("pwsh");
            process.args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                cmd,
            ]);
            process
        }
        WindowsShell::PowerShell => {
            let mut process = tokio::process::Command::new("powershell");
            process.args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                cmd,
            ]);
            process
        }
        WindowsShell::Cmd => {
            let mut process = tokio::process::Command::new("cmd");
            process.args(["/C", cmd]);
            process
        }
    };

    command
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x08000000)
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())
}

#[cfg(not(target_os = "windows"))]
fn spawn_shell(cmd: &str, cwd: &Path) -> Result<tokio::process::Child, String> {
    tokio::process::Command::new("sh")
        .args(["-lc", cmd])
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn spawn_silent(program: &str, args: &[&str]) -> Result<tokio::process::Child, String> {
    tokio::process::Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x08000000)
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())
}

#[cfg(not(target_os = "windows"))]
fn spawn_silent(program: &str, args: &[&str]) -> Result<tokio::process::Child, String> {
    tokio::process::Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())
}

async fn run_silent(program: &str, args: &[&str]) -> Result<String, String> {
    let child = spawn_silent(program, args)?;
    let output = child.wait_with_output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

async fn execute_terminal_command(
    command: &str,
    cwd: &str,
    command_id: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<TerminalCommandResult, String> {
    let trimmed = command.trim();

    if trimmed.is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    if trimmed.len() > 4000 {
        return Err("Command is too long".to_string());
    }

    let lowercase = trimmed.to_ascii_lowercase();
    const BLOCKED_PREFIXES: &[&str] = &["format ", "format.", "diskpart", "rm -rf /", "del /s /q c:\\", "rd /s /q c:\\"];
    for prefix in BLOCKED_PREFIXES {
        if lowercase.starts_with(prefix) {
            return Err("This command is blocked for safety. Use a native terminal if you need to run destructive system commands.".to_string());
        }
    }

    let resolved_cwd = resolve_working_directory(cwd)?;

    if let Some(cd_result) = resolve_cd_target(trimmed, &resolved_cwd) {
        let next_cwd = cd_result?;
        return Ok(TerminalCommandResult {
            stdout: clean_path_display(&next_cwd),
            stderr: String::new(),
            exit_code: 0,
            duration_ms: 0,
            resolved_cwd: clean_path_display(&next_cwd),
            timed_out: false,
            cancelled: false,
        });
    }

    let effective_command = normalize_shell_command(trimmed);
    let started_at = std::time::Instant::now();
    let cmd_id = command_id.unwrap_or_default();
    let dur = Duration::from_secs(timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS));

    let child = spawn_shell(&effective_command, &resolved_cwd)?;

    let pid = child.id();
    if !cmd_id.is_empty() {
        if let Ok(mut map) = RUNNING_PROCESSES.lock() {
            map.insert(cmd_id.clone(), pid);
        }
    }

    let result = timeout(dur, child.wait_with_output()).await;

    let was_cancelled = if !cmd_id.is_empty() {
        CANCELLED_COMMANDS
            .lock()
            .ok()
            .map(|mut cancelled| cancelled.remove(&cmd_id))
            .unwrap_or(false)
    } else {
        false
    };

    if !cmd_id.is_empty() {
        if let Ok(mut map) = RUNNING_PROCESSES.lock() {
            map.remove(&cmd_id);
        }
    }

    let duration_ms = started_at.elapsed().as_millis();

    match result {
        Ok(Ok(output)) => {
            let stdout_str = truncate_terminal_output(
                String::from_utf8_lossy(&output.stdout).into_owned(),
                "\n\n[Output truncated at 1MB]",
            );
            let stderr_str = truncate_terminal_output(
                String::from_utf8_lossy(&output.stderr).into_owned(),
                "\n\n[Error output truncated at 1MB]",
            );

            Ok(TerminalCommandResult {
                stdout: stdout_str,
                stderr: stderr_str,
                exit_code: output.status.code().unwrap_or(if output.status.success() { 0 } else { -1 }),
                duration_ms,
                resolved_cwd: clean_path_display(&resolved_cwd),
                timed_out: false,
                cancelled: was_cancelled,
            })
        }
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => Ok(TerminalCommandResult {
            stdout: String::new(),
            stderr: if was_cancelled {
                "Command cancelled".to_string()
            } else {
                format!("Command timed out after {}s", dur.as_secs())
            },
            exit_code: -1,
            duration_ms,
            resolved_cwd: clean_path_display(&resolved_cwd),
            timed_out: !was_cancelled,
            cancelled: was_cancelled,
        }),
    }
}

#[allow(dead_code)]
async fn execute_persistent_pty_session_command(
    app_handle: &tauri::AppHandle,
    session_id: &str,
    command: &str,
    cwd: &str,
    command_id: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<TerminalCommandResult, String> {
    let trimmed = command.trim();

    if trimmed.is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    if trimmed.len() > 4000 {
        return Err("Command is too long".to_string());
    }

    let resolved_cwd = resolve_working_directory(cwd)?;
    let session = ensure_persistent_pty_session(session_id, &resolved_cwd)?;
    let started_at = std::time::Instant::now();
    let dur = Duration::from_secs(timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS));
    let next_command_id = command_id
        .and_then(|value| {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        });
    let marker_token = next_pty_marker_token(next_command_id.as_deref());
    let wrapped_command = build_pty_wrapped_command(trimmed, &marker_token);

    if let Some(command_id) = next_command_id.clone() {
        if let Ok(mut running_pty_commands) = RUNNING_PTY_COMMANDS.lock() {
            running_pty_commands.insert(command_id, session_id.to_string());
        }
    }

    let (result_tx, mut result_rx) = tokio::sync::mpsc::unbounded_channel();
    let command_session = session.clone();
    let stream_context = PtyStreamContext {
        app_handle: app_handle.clone(),
        session_id: session_id.to_string(),
        command_id: next_command_id.clone(),
    };
    tokio::task::spawn_blocking(move || {
        let result = execute_persistent_pty_command_blocking(
            command_session,
            wrapped_command,
            marker_token,
            Some(stream_context),
        );
        let _ = result_tx.send(result);
    });

    let mut timed_out = false;
    let execution_result = match timeout(dur, result_rx.recv()).await {
        Ok(Some(result)) => result,
        Ok(None) => Err("Persistent PTY worker stopped unexpectedly".to_string()),
        Err(_) => {
            timed_out = true;
            if let Some(command_id) = next_command_id.as_deref() {
                let _ = terminate_running_process_with_mode(command_id, false).await;
            } else if let Some(session) = remove_persistent_pty_session(session_id) {
                let _ = terminate_persistent_pty_session(&session);
            }

            match timeout(Duration::from_secs(5), result_rx.recv()).await {
                Ok(Some(result)) => result,
                Ok(None) | Err(_) => Err(format!("Command timed out after {}s", dur.as_secs())),
            }
        }
    };

    let was_cancelled = next_command_id
        .as_ref()
        .and_then(|command_id| {
            CANCELLED_COMMANDS
                .lock()
                .ok()
                .map(|mut cancelled_commands| cancelled_commands.remove(command_id))
        })
        .unwrap_or(false);

    if let Some(command_id) = next_command_id.as_ref() {
        if let Ok(mut running_pty_commands) = RUNNING_PTY_COMMANDS.lock() {
            running_pty_commands.remove(command_id);
        }
    }

    let duration_ms = started_at.elapsed().as_millis();

    if timed_out {
        return Ok(TerminalCommandResult {
            stdout: String::new(),
            stderr: format!("Command timed out after {}s", dur.as_secs()),
            exit_code: -1,
            duration_ms,
            resolved_cwd: clean_path_display(&resolved_cwd),
            timed_out: true,
            cancelled: false,
        });
    }

    match execution_result {
        Ok(capture) => {
            let resolved_cwd_display = resolve_working_directory(&capture.resolved_cwd)
                .map(|path| clean_path_display(&path))
                .unwrap_or_else(|_| capture.resolved_cwd.clone());
            let mut stdout = capture.stdout;

            if stdout.trim().is_empty() {
                if let Some(Ok(next_cwd)) = resolve_cd_target(trimmed, &resolved_cwd) {
                        stdout = clean_path_display(&next_cwd);
                }
            }

            Ok(TerminalCommandResult {
                stdout,
                stderr: String::new(),
                exit_code: capture.exit_code,
                duration_ms,
                resolved_cwd: resolved_cwd_display,
                timed_out: false,
                cancelled: was_cancelled,
            })
        }
        Err(error) => {
            if let Some(session) = remove_persistent_pty_session(session_id) {
                let _ = terminate_persistent_pty_session(&session);
            }

            if was_cancelled {
                Ok(TerminalCommandResult {
                    stdout: String::new(),
                    stderr: "Command cancelled".to_string(),
                    exit_code: -1,
                    duration_ms,
                    resolved_cwd: clean_path_display(&resolved_cwd),
                    timed_out: false,
                    cancelled: true,
                })
            } else {
                Err(error)
            }
        }
    }
}

async fn execute_terminal_command_with_backend(
    backend_kind: &str,
    command: &str,
    cwd: &str,
    command_id: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<TerminalCommandResult, String> {
    match terminal_runtime_backend_for_kind(backend_kind).kind {
        "sessionized-shell" => execute_terminal_command(command, cwd, command_id, timeout_secs).await,
        "persistent-pty" => execute_terminal_command(command, cwd, command_id, timeout_secs).await,
        other => Err(format!("Unsupported terminal runtime backend: {}", other)),
    }
}

async fn execute_terminal_session_command_with_backend(
    _app_handle: &tauri::AppHandle,
    _backend_kind: &str,
    _session_id: &str,
    command: &str,
    cwd: &str,
    command_id: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<TerminalCommandResult, String> {
    execute_terminal_command(command, cwd, command_id, timeout_secs).await
}

#[tauri::command]
fn ensure_terminal_session(
    app_handle: tauri::AppHandle,
    session_id: String,
    cwd: String,
    label: Option<String>,
    session_kind: Option<String>,
) -> Result<TerminalSessionSnapshot, String> {
    let ensured = ensure_terminal_session_record(&session_id, &cwd, label, session_kind)?;
    if let Some(event) = ensured.event.clone() {
        emit_terminal_session_live(
            &app_handle,
            terminal_session_live_payload(ensured.snapshot.clone(), Some(event)),
        );
    }

    Ok(ensured.snapshot)
}

#[tauri::command]
fn start_pty_stream(
    app_handle: tauri::AppHandle,
    session_id: String,
) -> Result<bool, String> {
    let pty_session = PERSISTENT_PTY_SESSIONS
        .lock()
        .map_err(|error| error.to_string())?
        .get(&session_id)
        .cloned();

    if let Some(session) = pty_session {
        start_pty_background_reader(&app_handle, &session_id, &session);
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn get_terminal_session_snapshot(session_id: String) -> Result<Option<TerminalSessionSnapshot>, String> {
    let sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
    Ok(sessions.get(&session_id).map(session_snapshot_from_record))
}

#[tauri::command]
fn get_terminal_session_events(
    session_id: String,
    limit: Option<usize>,
) -> Result<Vec<TerminalSessionEvent>, String> {
    let sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
    let Some(record) = sessions.get(&session_id) else {
        return Ok(Vec::new());
    };

    let max_items = limit.unwrap_or(24).min(MAX_SESSION_EVENTS);
    let start_index = record.events.len().saturating_sub(max_items);
    Ok(record.events[start_index..].iter().rev().cloned().collect())
}

#[tauri::command]
fn list_terminal_sessions() -> Result<Vec<TerminalSessionSnapshot>, String> {
    let sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
    let mut snapshots = sessions
        .values()
        .map(session_snapshot_from_record)
        .collect::<Vec<_>>();
    snapshots.sort_by(|left, right| right.updated_at_ms.cmp(&left.updated_at_ms));
    Ok(snapshots)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
async fn run_terminal_session_command(
    app_handle: tauri::AppHandle,
    session_id: String,
    command: String,
    cwd: String,
    label: Option<String>,
    session_kind: Option<String>,
    command_id: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<TerminalSessionCommandResult, String> {
    let ensured = ensure_terminal_session_record(&session_id, &cwd, label, session_kind)?;
    if let Some(event) = ensured.event.clone() {
        emit_terminal_session_live(
            &app_handle,
            terminal_session_live_payload(ensured.snapshot.clone(), Some(event)),
        );
    }
    let next_command_id = command_id
        .clone()
        .and_then(|value| if value.trim().is_empty() { None } else { Some(value) });
    let trimmed_command = command.trim().to_string();

    let start_live_payload = {
        let mut sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
        if let Some(record) = sessions.get_mut(&session_id) {
            record.updated_at_ms = current_timestamp_ms();
            record.is_running = true;
            record.active_command_id = next_command_id.clone();
            record.last_command = Some(trimmed_command.clone());
            let start_event = push_session_event(
                record,
                "command-started",
                format!("Started {}", trimmed_command),
                Some(trimmed_command.clone()),
                next_command_id.clone(),
                None,
                None,
            );
            Some(terminal_session_live_payload(
                session_snapshot_from_record(record),
                Some(start_event),
            ))
        } else {
            None
        }
    };
    if let Some(payload) = start_live_payload {
        emit_terminal_session_live(&app_handle, payload);
    }

    let result = execute_terminal_session_command_with_backend(
        &app_handle,
        &ensured.snapshot.backend_kind,
        &session_id,
        &command,
        &ensured.snapshot.cwd,
        next_command_id.clone(),
        timeout_secs,
    )
    .await;

    let mut sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
    let record = sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("Terminal session not found: {}", session_id))?;
    record.updated_at_ms = current_timestamp_ms();
    record.is_running = false;
    record.active_command_id = None;
    let mut live_payloads = Vec::new();

    let response = match result {
        Ok(command_result) => {
            let previous_cwd = record.cwd.clone();
            record.cwd = resolve_working_directory(&command_result.resolved_cwd)
                .unwrap_or_else(|_| PathBuf::from(&command_result.resolved_cwd));
            record.last_command = Some(trimmed_command);
            record.last_exit_code = Some(command_result.exit_code);
            record.last_duration_ms =
                Some(command_result.duration_ms.min(u128::from(u64::MAX)) as u64);
            record.execution_count = record.execution_count.saturating_add(1);
            let last_command = record.last_command.clone();
            let last_duration_ms = record.last_duration_ms;
            if previous_cwd != record.cwd {
                let cwd_event = push_session_event(
                    record,
                    "cwd-changed",
                    format!("Working directory changed to {}", clean_path_display(&record.cwd)),
                    last_command.clone(),
                    next_command_id.clone(),
                    None,
                    None,
                );
                live_payloads.push(terminal_session_live_payload(
                    session_snapshot_from_record(record),
                    Some(cwd_event),
                ));
            }
            let finished_event = push_session_event(
                record,
                if command_result.cancelled {
                    "command-cancelled"
                } else if command_result.timed_out {
                    "command-timed-out"
                } else {
                    "command-finished"
                },
                if command_result.cancelled {
                    format!("Cancelled {}", record.last_command.as_deref().unwrap_or("command"))
                } else if command_result.timed_out {
                    format!("Timed out {}", record.last_command.as_deref().unwrap_or("command"))
                } else {
                    format!(
                        "Finished {} with exit {}",
                        record.last_command.as_deref().unwrap_or("command"),
                        command_result.exit_code
                    )
                },
                last_command,
                next_command_id.clone(),
                Some(command_result.exit_code),
                last_duration_ms,
            );
            let snapshot = session_snapshot_from_record(record);
            live_payloads.push(terminal_session_live_payload(
                snapshot.clone(),
                Some(finished_event),
            ));

            Ok(TerminalSessionCommandResult {
                result: command_result,
                session_snapshot: snapshot,
            })
        }
        Err(error) => {
            let error_event = push_session_event(
                record,
                "command-error",
                error.clone(),
                Some(trimmed_command),
                next_command_id.clone(),
                None,
                None,
            );
            live_payloads.push(terminal_session_live_payload(
                session_snapshot_from_record(record),
                Some(error_event),
            ));
            Err(error)
        }
    };

    drop(sessions);
    for payload in live_payloads {
        emit_terminal_session_live(&app_handle, payload);
    }

    response
}

#[tauri::command]
async fn close_terminal_session(app_handle: tauri::AppHandle, session_id: String) -> Result<bool, String> {
    let active_command_id = {
        let sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
        sessions
            .get(&session_id)
            .and_then(|record| record.active_command_id.clone())
    };

    if let Some(command_id) = active_command_id {
        let _ = terminate_running_process(&command_id).await;
    }

    let mut sessions = TERMINAL_SESSIONS.lock().map_err(|error| error.to_string())?;
    if let Some(mut record) = sessions.remove(&session_id) {
        if let Some(session) = remove_persistent_pty_session(&session_id) {
            let _ = terminate_persistent_pty_session(&session);
        }
        let closed_event = push_session_event(
            &mut record,
            "session-closed",
            "Session closed".to_string(),
            None,
            None,
            None,
            None,
        );
        let payload = terminal_session_live_payload(session_snapshot_from_record(&record), Some(closed_event));
        drop(sessions);
        emit_terminal_session_live(&app_handle, payload);
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn run_terminal_command(
    command: String,
    cwd: String,
    command_id: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<TerminalCommandResult, String> {
    execute_terminal_command_with_backend(
        terminal_backend_kind(),
        &command,
        &cwd,
        command_id,
        timeout_secs,
    )
    .await
}

#[tauri::command]
async fn cancel_running_command(app_handle: tauri::AppHandle, command_id: String) -> Result<bool, String> {
    let cancelled = terminate_running_process(&command_id).await?;

    let mut live_payloads = Vec::new();
    if cancelled {
        if let Ok(mut sessions) = TERMINAL_SESSIONS.lock() {
            for record in sessions.values_mut() {
                if record.active_command_id.as_deref() == Some(command_id.as_str()) {
                    record.is_running = false;
                    record.active_command_id = None;
                    record.updated_at_ms = current_timestamp_ms();
                    let last_command = record.last_command.clone();
                    let cancel_event = push_session_event(
                        record,
                        "cancel-requested",
                        "Cancellation requested by operator".to_string(),
                        last_command,
                        Some(command_id.clone()),
                        None,
                        None,
                    );
                    live_payloads.push(terminal_session_live_payload(
                        session_snapshot_from_record(record),
                        Some(cancel_event),
                    ));
                }
            }
        }
    }

    for payload in live_payloads {
        emit_terminal_session_live(&app_handle, payload);
    }

    Ok(cancelled)
}

#[tauri::command]
fn write_terminal_session_input(session_id: String, input: String) -> Result<bool, String> {
    if input.is_empty() {
        return Ok(false);
    }

    let session = {
        let sessions = PERSISTENT_PTY_SESSIONS.lock().map_err(|error| error.to_string())?;
        sessions.get(&session_id).cloned()
    };

    let Some(session) = session else {
        return Ok(false);
    };

    let mut writer = match session.writer.try_lock() {
        Ok(w) => w,
        Err(_) => return Ok(false),
    };
    if let Err(_) = writer.write_all(input.as_bytes()) {
        return Ok(false);
    }
    let _ = writer.flush();
    Ok(true)
}

#[tauri::command]
fn resize_terminal_session(session_id: String, cols: u16, rows: u16) -> Result<bool, String> {
    let session = {
        let sessions = PERSISTENT_PTY_SESSIONS.lock().map_err(|error| error.to_string())?;
        sessions.get(&session_id).cloned()
    };

    let Some(session) = session else {
        return Ok(false);
    };

    let master = session.master.lock().map_err(|error| error.to_string())?;
    master
        .resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn get_git_branch(cwd: String) -> Result<Option<String>, String> {
    let resolved = resolve_working_directory(&cwd)?;

    #[cfg(target_os = "windows")]
    let output = tokio::process::Command::new("cmd")
        .args(["/C", "git rev-parse --abbrev-ref HEAD 2>nul"])
        .current_dir(&resolved)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x08000000)
        .output()
        .await;

    #[cfg(not(target_os = "windows"))]
    let output = tokio::process::Command::new("sh")
        .args(["-c", "git rev-parse --abbrev-ref HEAD 2>/dev/null"])
        .current_dir(&resolved)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await;

    match output {
        Ok(o) if o.status.success() => {
            let branch = String::from_utf8_lossy(&o.stdout).trim().to_string();
            Ok(if branch.is_empty() { None } else { Some(branch) })
        }
        _ => Ok(None),
    }
}

#[tauri::command]
async fn list_directory_contents(cwd: String, prefix: Option<String>) -> Result<Vec<DirectoryEntry>, String> {
    let resolved = resolve_working_directory(&cwd)?;
    let target = if let Some(ref p) = prefix {
        let candidate = resolved.join(p);
        let candidate_canonical = candidate.canonicalize().unwrap_or(candidate.clone());
        let resolved_canonical = resolved.canonicalize().unwrap_or(resolved.clone());
        if !candidate_canonical.starts_with(&resolved_canonical) {
            return Err("Path traversal outside working directory is not allowed.".to_string());
        }
        if candidate.is_dir() {
            candidate
        } else {
            candidate.parent().map(|pp| pp.to_path_buf()).unwrap_or(resolved)
        }
    } else {
        resolved
    };

    let mut entries = Vec::new();
    let mut read_dir = tokio::fs::read_dir(&target).await.map_err(|e| e.to_string())?;
    let mut count = 0u32;

    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        if count >= 200 { break; }
        let name = entry.file_name().to_string_lossy().into_owned();

        if let Some(ref p) = prefix {
            let file_part = PathBuf::from(p)
                .file_name()
                .map(|f| f.to_string_lossy().into_owned())
                .unwrap_or_default();
            if !file_part.is_empty() && !name.to_lowercase().starts_with(&file_part.to_lowercase()) {
                continue;
            }
        }

        let is_dir = entry.file_type().await.map(|ft| ft.is_dir()).unwrap_or(false);
        let size = entry.metadata().await.map(|m| m.len()).unwrap_or(0);
        entries.push(DirectoryEntry { name, is_dir, size });
        count += 1;
    }

    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(entries)
}

#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown".into());
    let username = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "unknown".into());
    let home_dir = detect_home_dir()
        .map(|p| clean_path_display(&p))
        .unwrap_or_else(|| "unknown".into());

    #[cfg(target_os = "windows")]
    let shell = windows_shell_label().to_string();
    #[cfg(not(target_os = "windows"))]
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "sh".into());

    let node_version = run_silent("node", &["--version"]).await.unwrap_or_default();
    let rust_version = run_silent("rustc", &["--version"]).await.unwrap_or_default();

    Ok(SystemInfo { os, arch, hostname, username, home_dir, shell, node_version, rust_version })
}

#[tauri::command]
fn get_agent_cli_resolutions(clis: Option<Vec<String>>) -> Result<Vec<AgentCliResolution>, String> {
    let targets = clis.unwrap_or_else(|| AGENT_CLI_IDS.iter().map(|cli| cli.to_string()).collect());
    Ok(targets.into_iter().map(|cli| resolve_agent_cli(&cli)).collect())
}

#[tauri::command]
fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
async fn check_app_update() -> Result<AppUpdateInfo, String> {
    let release = fetch_latest_github_release().await?;
    Ok(build_app_update_info(release))
}

#[tauri::command]
async fn install_app_update() -> Result<String, String> {
    let release = fetch_latest_github_release().await?;
    let update = build_app_update_info(release);

    if !update.has_update {
        return Err("No newer version is available.".to_string());
    }

    if !update.installer_available {
        return Err("No Windows installer asset was found for the latest release.".to_string());
    }

    let asset_url = update
        .asset_download_url
        .clone()
        .ok_or_else(|| "Missing installer download URL.".to_string())?;

    if !asset_url.starts_with("https://github.com/") && !asset_url.starts_with("https://objects.githubusercontent.com/") {
        return Err(format!("Refusing to download installer from untrusted domain: {}", asset_url));
    }

    let asset_name = update
        .asset_name
        .clone()
        .unwrap_or_else(|| "sloerspace-update-installer.exe".to_string());

    let client = reqwest::Client::builder()
        .user_agent(APP_UPDATE_USER_AGENT)
        .build()
        .map_err(|error| error.to_string())?;

    let installer_bytes = client
        .get(asset_url)
        .header("Accept", "application/octet-stream")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .bytes()
        .await
        .map_err(|error| error.to_string())?;

    let update_dir = std::env::temp_dir().join("sloerspace-updates");
    tokio::fs::create_dir_all(&update_dir)
        .await
        .map_err(|error| error.to_string())?;

    let installer_path = update_dir.join(sanitize_update_filename(&asset_name));
    tokio::fs::write(&installer_path, &installer_bytes)
        .await
        .map_err(|error| error.to_string())?;

    launch_downloaded_installer(&installer_path).await?;

    Ok(clean_path_display(&installer_path))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DroppedFileResult {
    path: String,
    escaped_path: String,
    is_image: bool,
    is_dir: bool,
    file_name: String,
    iterm2_sequence: Option<String>,
}

fn is_image_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            matches!(
                ext.to_ascii_lowercase().as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "bmp" | "webp" | "svg" | "ico" | "tiff" | "tif"
            )
        })
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn escape_path_for_shell(path: &str) -> String {
    match *WINDOWS_SHELL {
        WindowsShell::Pwsh | WindowsShell::PowerShell => {
            if path.contains(' ') || path.contains('(') || path.contains(')') || path.contains('&') {
                format!("'{}'", path.replace('\'', "''"))
            } else {
                path.to_string()
            }
        }
        WindowsShell::Cmd => {
            if path.contains(' ') || path.contains('&') || path.contains('^') {
                format!("\"{}\"", path)
            } else {
                path.to_string()
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn escape_path_for_shell(path: &str) -> String {
    if path.contains(' ') || path.contains('(') || path.contains(')') || path.contains('&')
        || path.contains('\'') || path.contains('"') || path.contains('$') || path.contains('!')
    {
        format!("'{}'", path.replace('\'', "'\"'\"'"))
    } else {
        path.to_string()
    }
}

fn encode_iterm2_inline_image(file_path: &Path) -> Option<String> {
    let data = std::fs::read(file_path).ok()?;
    if data.is_empty() || data.len() > 10_485_760 {
        return None;
    }

    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut base64_buf = Vec::with_capacity(data.len() * 4 / 3 + 4);
    let mut i = 0;
    while i < data.len() {
        let b0 = data[i] as u32;
        let b1 = if i + 1 < data.len() { data[i + 1] as u32 } else { 0 };
        let b2 = if i + 2 < data.len() { data[i + 2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        base64_buf.push(alphabet[((triple >> 18) & 0x3F) as usize]);
        base64_buf.push(alphabet[((triple >> 12) & 0x3F) as usize]);
        if i + 1 < data.len() {
            base64_buf.push(alphabet[((triple >> 6) & 0x3F) as usize]);
        } else {
            base64_buf.push(b'=');
        }
        if i + 2 < data.len() {
            base64_buf.push(alphabet[(triple & 0x3F) as usize]);
        } else {
            base64_buf.push(b'=');
        }
        i += 3;
    }
    let base64_str = String::from_utf8(base64_buf).ok()?;

    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image");

    Some(format!(
        "\x1b]1337;File=name={};size={};inline=1:{}\x07",
        file_name,
        data.len(),
        base64_str,
    ))
}

#[tauri::command]
fn handle_dropped_files(paths: Vec<String>) -> Result<Vec<DroppedFileResult>, String> {
    let mut results = Vec::with_capacity(paths.len());

    for raw_path in &paths {
        let path = PathBuf::from(raw_path.trim());

        if !path.exists() {
            continue;
        }

        let clean = clean_path_display(&path.canonicalize().unwrap_or_else(|_| path.clone()));
        let is_dir = path.is_dir();
        let is_image = !is_dir && is_image_extension(&path);
        let escaped = escape_path_for_shell(&clean);
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let iterm2_sequence = if is_image {
            encode_iterm2_inline_image(&path)
        } else {
            None
        };

        results.push(DroppedFileResult {
            path: clean,
            escaped_path: escaped,
            is_image,
            is_dir,
            file_name,
            iterm2_sequence,
        });
    }

    Ok(results)
}

// ── Browser Pane Management (native WebView2 via unstable multi-webview) ──

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BrowserPaneInfo {
    id: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

static BROWSER_PANES: LazyLock<Mutex<HashMap<String, BrowserPaneInfo>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
async fn browser_create_pane(
    app: tauri::AppHandle,
    pane_id: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<BrowserPaneInfo, String> {
    use tauri::webview::WebviewBuilder;
    use tauri::WebviewUrl;

    let window = app
        .get_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let webview_url = WebviewUrl::External(
        url.parse().map_err(|e| format!("Invalid URL: {}", e))?,
    );

    let builder = WebviewBuilder::new(&pane_id, webview_url)
        .transparent(false)
        .initialization_script("document.documentElement.style.backgroundColor='#0a0e17';document.body.style.backgroundColor='#0a0e17';");

    // Use PhysicalPosition/PhysicalSize — frontend sends physical pixels (CSS * devicePixelRatio)
    let _webview = window
        .add_child(
            builder,
            tauri::PhysicalPosition::<i32>::new(x as i32, y as i32),
            tauri::PhysicalSize::<u32>::new(width as u32, height as u32),
        )
        .map_err(|e| format!("Failed to create browser pane: {}", e))?;

    let info = BrowserPaneInfo {
        id: pane_id.clone(),
        url: url.clone(),
        x,
        y,
        width,
        height,
    };

    if let Ok(mut panes) = BROWSER_PANES.lock() {
        panes.insert(pane_id, info.clone());
    }

    Ok(info)
}

#[tauri::command]
async fn browser_close_pane(app: tauri::AppHandle, pane_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&pane_id) {
        // Hide immediately, then close
        let _ = webview.hide();
        webview.close().map_err(|e| format!("Failed to close browser pane: {}", e))?;
    }

    if let Ok(mut panes) = BROWSER_PANES.lock() {
        panes.remove(&pane_id);
    }

    Ok(())
}

#[tauri::command]
async fn browser_navigate_pane(
    app: tauri::AppHandle,
    pane_id: String,
    url: String,
) -> Result<BrowserPaneInfo, String> {
    // Navigate in-place using JS — no destroy/recreate
    if let Some(webview) = app.get_webview(&pane_id) {
        let safe_url = url.replace('\\', "\\\\").replace('\'', "\\'");
        let script = format!("window.location.href='{}'", safe_url);
        webview.eval(&script).map_err(|e| format!("Failed to navigate: {}", e))?;
    } else {
        return Err(format!("Browser pane '{}' not found", pane_id));
    }

    // Update stored URL
    if let Ok(mut panes) = BROWSER_PANES.lock() {
        if let Some(info) = panes.get_mut(&pane_id) {
            info.url = url;
        }
    }

    let panes = BROWSER_PANES.lock().map_err(|e| e.to_string())?;
    panes.get(&pane_id).cloned().ok_or_else(|| "Pane not found after navigate".to_string())
}

#[tauri::command]
async fn browser_set_visible(app: tauri::AppHandle, pane_id: String, visible: bool) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&pane_id) {
        if visible {
            webview.show().map_err(|e| format!("Failed to show: {}", e))?;
        } else {
            webview.hide().map_err(|e| format!("Failed to hide: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn browser_resize_pane(
    app: tauri::AppHandle,
    pane_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&pane_id) {
        webview
            .set_position(tauri::PhysicalPosition::<i32>::new(x as i32, y as i32))
            .map_err(|e| format!("Failed to set position: {}", e))?;
        webview
            .set_size(tauri::PhysicalSize::<u32>::new(width as u32, height as u32))
            .map_err(|e| format!("Failed to set size: {}", e))?;
    }

    if let Ok(mut panes) = BROWSER_PANES.lock() {
        if let Some(info) = panes.get_mut(&pane_id) {
            info.x = x;
            info.y = y;
            info.width = width;
            info.height = height;
        }
    }

    Ok(())
}

#[tauri::command]
async fn browser_list_panes() -> Result<Vec<BrowserPaneInfo>, String> {
    let panes = BROWSER_PANES.lock().map_err(|e| e.to_string())?;
    Ok(panes.values().cloned().collect())
}

#[tauri::command]
async fn browser_toggle_devtools(app: tauri::AppHandle, pane_id: String) -> Result<bool, String> {
    if let Some(webview) = app.get_webview(&pane_id) {
        if webview.is_devtools_open() {
            webview.close_devtools();
            Ok(false)
        } else {
            webview.open_devtools();
            Ok(true)
        }
    } else {
        Err(format!("Browser pane '{}' not found", pane_id))
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct GitStatusEntry {
    path: String,
    status: String,
    staged: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitLogEntry {
    hash: String,
    short_hash: String,
    author: String,
    date: String,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitInfo {
    branch: String,
    entries: Vec<GitStatusEntry>,
    ahead: u32,
    behind: u32,
    is_repo: bool,
}

#[tauri::command]
async fn get_git_status(cwd: String) -> Result<GitInfo, String> {
    let branch_out = run_silent_in("git", &["branch", "--show-current"], &cwd).await.unwrap_or_default();
    let branch = branch_out.trim().to_string();
    if branch.is_empty() {
        return Ok(GitInfo { branch: String::new(), entries: vec![], ahead: 0, behind: 0, is_repo: false });
    }

    let status_out = run_silent_in("git", &["status", "--porcelain=v1"], &cwd).await.unwrap_or_default();
    let entries: Vec<GitStatusEntry> = status_out.lines().filter(|l| l.len() >= 3).map(|line| {
        let xy = &line[..2];
        let path = line[3..].trim().to_string();
        let staged = xy.as_bytes()[0] != b' ' && xy.as_bytes()[0] != b'?';
        let status = match xy.as_bytes()[0] {
            b'M' => "modified", b'A' => "added", b'D' => "deleted", b'R' => "renamed", b'C' => "copied",
            _ => match xy.as_bytes()[1] { b'M' => "modified", b'D' => "deleted", b'?' => "untracked", _ => "unknown" },
        }.to_string();
        GitStatusEntry { path, status, staged }
    }).collect();

    let ab_out = run_silent_in("git", &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], &cwd).await.unwrap_or_default();
    let parts: Vec<u32> = ab_out.split_whitespace().filter_map(|s| s.parse().ok()).collect();
    let ahead = parts.first().copied().unwrap_or(0);
    let behind = parts.get(1).copied().unwrap_or(0);

    Ok(GitInfo { branch, entries, ahead, behind, is_repo: true })
}

#[tauri::command]
async fn get_git_log(cwd: String, count: Option<u32>) -> Result<Vec<GitLogEntry>, String> {
    let n = count.unwrap_or(30).to_string();
    let out = run_silent_in("git", &["log", &format!("-{}", n), "--pretty=format:%H|%h|%an|%ad|%s", "--date=relative"], &cwd).await.unwrap_or_default();
    let entries = out.lines().filter_map(|line| {
        let parts: Vec<&str> = line.splitn(5, '|').collect();
        if parts.len() == 5 {
            Some(GitLogEntry { hash: parts[0].into(), short_hash: parts[1].into(), author: parts[2].into(), date: parts[3].into(), message: parts[4].into() })
        } else { None }
    }).collect();
    Ok(entries)
}

#[tauri::command]
async fn get_git_diff(cwd: String, file_path: Option<String>, staged: Option<bool>) -> Result<String, String> {
    let mut args = vec!["diff"];
    if staged.unwrap_or(false) { args.push("--cached"); }
    let fp_owned;
    if let Some(ref fp) = file_path { fp_owned = fp.clone(); args.push(&fp_owned); }
    run_silent_in("git", &args, &cwd).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_stage_file(cwd: String, file_path: String) -> Result<(), String> {
    run_silent_in("git", &["add", &file_path], &cwd).await.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_unstage_file(cwd: String, file_path: String) -> Result<(), String> {
    run_silent_in("git", &["restore", "--staged", &file_path], &cwd).await.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_commit(cwd: String, message: String) -> Result<String, String> {
    run_silent_in("git", &["commit", "-m", &message], &cwd).await.map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SSHConnection {
    id: String,
    name: String,
    host: String,
    port: u16,
    username: String,
    auth_method: String, // "password" | "key"
    key_path: Option<String>,
}

#[tauri::command]
async fn test_ssh_connection(host: String, port: u16, username: String) -> Result<bool, String> {
    let addr = format!("{}@{}", username, host);
    let output = tokio::process::Command::new("ssh")
        .args(&["-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes", "-p", &port.to_string(), &addr, "echo", "ok"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("SSH not available: {}", e))?;
    Ok(output.status.success())
}

#[tauri::command]
fn get_ssh_bootstrap_command(host: String, port: u16, username: String, key_path: Option<String>) -> Result<String, String> {
    let mut cmd = format!("ssh -o StrictHostKeyChecking=no -p {} {}@{}", port, username, host);
    if let Some(key) = key_path {
        cmd = format!("ssh -o StrictHostKeyChecking=no -i \"{}\" -p {} {}@{}", key, port, username, host);
    }
    Ok(cmd)
}

async fn run_silent_in(cmd: &str, args: &[&str], cwd: &str) -> Result<String, String> {
    let output = tokio::process::Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[derive(Debug, Serialize, Deserialize)]
struct FileContentResult {
    content: String,
    path: String,
    size: u64,
    is_binary: bool,
}

#[tauri::command]
async fn read_file_content(path: String) -> Result<FileContentResult, String> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }
    let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| e.to_string())?;
    if metadata.len() > 5_000_000 {
        return Err("File too large (>5MB). Open in external editor.".to_string());
    }
    let bytes = tokio::fs::read(&file_path).await.map_err(|e| e.to_string())?;
    // Check if binary (contains null bytes in first 8KB)
    let is_binary = bytes.iter().take(8192).any(|&b| b == 0);
    if is_binary {
        return Ok(FileContentResult { content: String::new(), path, size: metadata.len(), is_binary: true });
    }
    let content = String::from_utf8_lossy(&bytes).into_owned();
    Ok(FileContentResult { content, path, size: metadata.len(), is_binary: false })
}

#[tauri::command]
async fn write_file_content(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, content.as_bytes()).await.map_err(|e| format!("Failed to write file: {}", e))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct EnvVarEntry {
    key: String,
    value: String,
    comment: Option<String>,
}

#[tauri::command]
async fn read_env_file(path: String) -> Result<Vec<EnvVarEntry>, String> {
    let content = tokio::fs::read_to_string(&path).await.map_err(|e| format!("Failed to read .env file: {}", e))?;
    let mut entries: Vec<EnvVarEntry> = Vec::new();
    let mut last_comment: Option<String> = None;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            last_comment = Some(trimmed.trim_start_matches('#').trim().to_string());
            continue;
        }
        if trimmed.is_empty() { last_comment = None; continue; }
        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim().to_string();
            let raw_value = trimmed[eq_pos + 1..].trim();
            let value = if (raw_value.starts_with('"') && raw_value.ends_with('"'))
                || (raw_value.starts_with('\'') && raw_value.ends_with('\'')) {
                raw_value[1..raw_value.len() - 1].to_string()
            } else {
                raw_value.to_string()
            };
            entries.push(EnvVarEntry { key, value, comment: last_comment.take() });
        }
        last_comment = None;
    }
    Ok(entries)
}

#[tauri::command]
async fn write_env_file(path: String, vars: Vec<EnvVarEntry>) -> Result<(), String> {
    let mut lines: Vec<String> = Vec::new();
    for var in &vars {
        if let Some(comment) = &var.comment {
            if !comment.is_empty() { lines.push(format!("# {}", comment)); }
        }
        let value = if var.value.contains(' ') || var.value.is_empty() {
            format!("\"{}\"", var.value)
        } else {
            var.value.clone()
        };
        lines.push(format!("{}={}", var.key, value));
    }
    tokio::fs::write(&path, lines.join("\n") + "\n").await.map_err(|e| format!("Failed to write .env file: {}", e))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LanguageStat {
    language: String,
    extension: String,
    file_count: usize,
    line_count: usize,
    color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct FileStat {
    path: String,
    name: String,
    size: u64,
    line_count: usize,
    modified: u64,
    language: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CodebaseStats {
    root: String,
    total_files: usize,
    total_lines: usize,
    total_size: u64,
    by_language: Vec<LanguageStat>,
    largest_files: Vec<FileStat>,
    recently_modified: Vec<FileStat>,
}

fn detect_language(ext: &str) -> (&'static str, &'static str) {
    match ext {
        "rs" => ("Rust", "#f74c00"),
        "ts" | "tsx" => ("TypeScript", "#3178c6"),
        "js" | "jsx" | "mjs" | "cjs" => ("JavaScript", "#f7df1e"),
        "py" => ("Python", "#3572a5"),
        "go" => ("Go", "#00add8"),
        "java" => ("Java", "#b07219"),
        "kt" => ("Kotlin", "#a97bff"),
        "cpp" | "cc" | "cxx" => ("C++", "#f34b7d"),
        "c" | "h" => ("C", "#555555"),
        "cs" => ("C#", "#178600"),
        "rb" => ("Ruby", "#701516"),
        "php" => ("PHP", "#4f5d95"),
        "swift" => ("Swift", "#f05138"),
        "html" | "htm" => ("HTML", "#e34c26"),
        "css" | "scss" | "sass" | "less" => ("CSS", "#563d7c"),
        "json" => ("JSON", "#292929"),
        "yaml" | "yml" => ("YAML", "#cb171e"),
        "toml" => ("TOML", "#9c4221"),
        "md" | "mdx" => ("Markdown", "#083fa1"),
        "sh" | "bash" | "zsh" | "fish" => ("Shell", "#89e051"),
        "sql" => ("SQL", "#e38c00"),
        "xml" => ("XML", "#0060ac"),
        "vue" => ("Vue", "#41b883"),
        "svelte" => ("Svelte", "#ff3e00"),
        _ => ("Other", "#8e8e8e"),
    }
}

#[async_recursion::async_recursion]
async fn walk_codebase(
    dir: &std::path::Path,
    depth: u32,
    skip_dirs: &[&str],
    stats: &mut std::collections::HashMap<String, LanguageStat>,
    all_files: &mut Vec<FileStat>,
) {
    if depth == 0 { return; }
    let mut read_dir = match tokio::fs::read_dir(dir).await {
        Ok(rd) => rd,
        Err(_) => return,
    };
    while let Ok(Some(entry)) = read_dir.next_entry().await {
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if name.starts_with('.') || skip_dirs.contains(&name.as_str()) { continue; }
        if path.is_dir() {
            walk_codebase(&path, depth - 1, skip_dirs, stats, all_files).await;
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if ext.is_empty() { continue; }
            let meta = match tokio::fs::metadata(&path).await {
                Ok(m) => m,
                Err(_) => continue,
            };
            let size = meta.len();
            if size > 10 * 1024 * 1024 { continue; }
            let modified = meta.modified().ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs()).unwrap_or(0);
            let content = match tokio::fs::read_to_string(&path).await {
                Ok(c) => c,
                Err(_) => continue,
            };
            let line_count = content.lines().count();
            let (lang_name, lang_color) = detect_language(&ext);
            let entry_stat = stats.entry(ext.clone()).or_insert_with(|| LanguageStat {
                language: lang_name.to_string(),
                extension: ext.clone(),
                file_count: 0,
                line_count: 0,
                color: lang_color.to_string(),
            });
            entry_stat.file_count += 1;
            entry_stat.line_count += line_count;
            all_files.push(FileStat {
                path: path.to_string_lossy().to_string(),
                name,
                size,
                line_count,
                modified,
                language: lang_name.to_string(),
            });
        }
    }
}

#[tauri::command]
async fn index_codebase(root: String, max_depth: Option<u32>) -> Result<CodebaseStats, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err("Not a directory".to_string());
    }
    let depth = max_depth.unwrap_or(6);
    let skip_dirs = ["node_modules", "target", ".git", "dist", "build", "out", ".next", "__pycache__", "vendor", ".cargo", "venv", ".venv"];
    let mut stats: std::collections::HashMap<String, LanguageStat> = std::collections::HashMap::new();
    let mut all_files: Vec<FileStat> = Vec::new();
    walk_codebase(&root_path, depth, &skip_dirs, &mut stats, &mut all_files).await;
    let total_files = all_files.len();
    let total_lines: usize = all_files.iter().map(|f| f.line_count).sum();
    let total_size: u64 = all_files.iter().map(|f| f.size).sum();
    let mut by_language: Vec<LanguageStat> = stats.into_values().collect();
    by_language.sort_by(|a, b| b.line_count.cmp(&a.line_count));
    let mut largest = all_files.clone();
    largest.sort_by(|a, b| b.line_count.cmp(&a.line_count));
    largest.truncate(10);
    let mut recent = all_files;
    recent.sort_by(|a, b| b.modified.cmp(&a.modified));
    recent.truncate(10);
    Ok(CodebaseStats { root, total_files, total_lines, total_size, by_language, largest_files: largest, recently_modified: recent })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProcessInfo {
    pid: u32,
    name: String,
    cpu_usage: f32,
    memory_mb: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct SystemStats {
    cpu_usage: f32,
    cpu_count: usize,
    memory_used_mb: f64,
    memory_total_mb: f64,
    memory_percent: f32,
    swap_used_mb: f64,
    swap_total_mb: f64,
    disk_used_gb: f64,
    disk_total_gb: f64,
    disk_percent: f32,
    uptime_secs: u64,
    top_processes: Vec<ProcessInfo>,
}

#[tauri::command]
async fn get_system_stats() -> Result<SystemStats, String> {
    use sysinfo::{Disks, System};
    let mut sys = System::new_all();
    sys.refresh_all();
    tokio::time::sleep(Duration::from_millis(200)).await;
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_usage();
    let cpu_count = sys.cpus().len();
    let memory_used_mb = sys.used_memory() as f64 / 1024.0 / 1024.0;
    let memory_total_mb = sys.total_memory() as f64 / 1024.0 / 1024.0;
    let memory_percent = if memory_total_mb > 0.0 { (memory_used_mb / memory_total_mb * 100.0) as f32 } else { 0.0 };
    let swap_used_mb = sys.used_swap() as f64 / 1024.0 / 1024.0;
    let swap_total_mb = sys.total_swap() as f64 / 1024.0 / 1024.0;

    let disks = Disks::new_with_refreshed_list();
    let (disk_used_gb, disk_total_gb) = disks.iter().fold((0.0f64, 0.0f64), |(used, total), d| {
        let t = d.total_space() as f64 / 1024.0 / 1024.0 / 1024.0;
        let u = t - d.available_space() as f64 / 1024.0 / 1024.0 / 1024.0;
        (used + u, total + t)
    });
    let disk_percent = if disk_total_gb > 0.0 { (disk_used_gb / disk_total_gb * 100.0) as f32 } else { 0.0 };

    let uptime_secs = System::uptime();

    let mut procs: Vec<ProcessInfo> = sys.processes().values().map(|p| ProcessInfo {
        pid: p.pid().as_u32(),
        name: p.name().to_string_lossy().to_string(),
        cpu_usage: p.cpu_usage(),
        memory_mb: p.memory() as f64 / 1024.0 / 1024.0,
    }).collect();
    procs.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
    procs.truncate(15);

    Ok(SystemStats { cpu_usage, cpu_count, memory_used_mb, memory_total_mb, memory_percent, swap_used_mb, swap_total_mb, disk_used_gb, disk_total_gb, disk_percent, uptime_secs, top_processes: procs })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PortEntry {
    port: u16,
    protocol: String,
    state: String,
    pid: Option<u32>,
    process_name: Option<String>,
    local_address: String,
}

#[tauri::command]
async fn scan_active_ports() -> Result<Vec<PortEntry>, String> {
    #[cfg(target_os = "windows")]
    let output = tokio::process::Command::new("netstat")
        .args(["-ano"])
        .output().await.map_err(|e| e.to_string())?;
    #[cfg(not(target_os = "windows"))]
    let output = tokio::process::Command::new("sh")
        .args(["-c", "ss -tlnup 2>/dev/null || netstat -tlnup 2>/dev/null"])
        .output().await.map_err(|e| e.to_string())?;

    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let mut entries: Vec<PortEntry> = Vec::new();
    let mut seen: std::collections::HashSet<u16> = std::collections::HashSet::new();

    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    for line in text.lines() {
        let cols: Vec<&str> = line.split_whitespace().collect();
        #[cfg(target_os = "windows")]
        if cols.len() >= 4 {
            let proto = cols[0].to_uppercase();
            if proto != "TCP" && proto != "UDP" { continue; }
            let local = cols[1];
            let state = if cols.len() >= 4 { cols[3].to_string() } else { "UNKNOWN".to_string() };
            let pid_str = if proto == "TCP" && cols.len() >= 5 { cols[4] } else if cols.len() >= 4 { cols[3] } else { "0" };
            if let Some(port_str) = local.rsplit(':').next() {
                if let Ok(port) = port_str.parse::<u16>() {
                    if seen.insert(port) {
                        let pid = pid_str.parse::<u32>().ok();
                        let process_name = pid.and_then(|p| {
                            sys.processes().get(&sysinfo::Pid::from_u32(p)).map(|pr| pr.name().to_string_lossy().to_string())
                        });
                        entries.push(PortEntry { port, protocol: proto, state, pid, process_name, local_address: local.to_string() });
                    }
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        if cols.len() >= 4 {
            let local = cols.get(3).or(cols.get(2)).unwrap_or(&"");
            if let Some(port_str) = local.rsplit(':').next() {
                if let Ok(port) = port_str.parse::<u16>() {
                    if seen.insert(port) {
                        entries.push(PortEntry { port, protocol: "TCP".to_string(), state: "LISTEN".to_string(), pid: None, process_name: None, local_address: local.to_string() });
                    }
                }
            }
        }
    }
    entries.sort_by_key(|e| e.port);
    entries.truncate(100);
    Ok(entries)
}

#[tauri::command]
async fn kill_process_by_pid(pid: u32) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let out = tokio::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/F"])
        .output().await.map_err(|e| e.to_string())?;
    #[cfg(not(target_os = "windows"))]
    let out = tokio::process::Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output().await.map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(format!("Process {} killed", pid))
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

#[tauri::command]
async fn get_directory_tree(root: String, max_depth: Option<u32>) -> Result<Vec<TreeEntry>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err("Not a directory".to_string());
    }
    let depth = max_depth.unwrap_or(3);
    let mut entries = Vec::new();
    collect_tree(&root_path, &root_path, depth, &mut entries).await;
    Ok(entries)
}

#[derive(Debug, Serialize, Deserialize)]
struct TreeEntry {
    name: String,
    path: String,
    is_dir: bool,
    depth: u32,
    size: u64,
    children_count: u32,
}

#[async_recursion::async_recursion]
async fn collect_tree(base: &Path, current: &Path, remaining_depth: u32, entries: &mut Vec<TreeEntry>) {
    if remaining_depth == 0 { return; }
    let Ok(mut read_dir) = tokio::fs::read_dir(current).await else { return };
    let mut local: Vec<(String, PathBuf, bool, u64)> = Vec::new();
    while let Ok(Some(entry)) = read_dir.next_entry().await {
        let name = entry.file_name().to_string_lossy().into_owned();
        // Skip hidden, node_modules, .git, target, etc.
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == "__pycache__" || name == ".next" || name == "dist" || name == "build" { continue; }
        let is_dir = entry.file_type().await.map(|ft| ft.is_dir()).unwrap_or(false);
        let size = entry.metadata().await.map(|m| m.len()).unwrap_or(0);
        local.push((name, entry.path(), is_dir, size));
    }
    // Sort: dirs first, then alpha
    local.sort_by(|a, b| b.2.cmp(&a.2).then(a.0.to_lowercase().cmp(&b.0.to_lowercase())));
    if local.len() > 200 { local.truncate(200); }

    for (name, full_path, is_dir, size) in local {
        let rel = full_path.strip_prefix(base).unwrap_or(&full_path).to_string_lossy().replace('\\', "/");
        let children_count = if is_dir {
            tokio::fs::read_dir(&full_path).await.map(|_| 1u32).unwrap_or(0)
        } else { 0 };
        let depth = rel.matches('/').count() as u32;
        entries.push(TreeEntry { name, path: rel, is_dir, depth, size, children_count });
        if is_dir && remaining_depth > 1 {
            collect_tree(base, &full_path, remaining_depth - 1, entries).await;
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct AIChatRequest {
    provider: String,
    api_key: String,
    model: String,
    endpoint: Option<String>,
    messages: Vec<AIChatMsg>,
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AIChatMsg {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct AIChatResponse {
    content: String,
    model: String,
    provider: String,
    tokens_used: u32,
}

#[tauri::command]
async fn ai_chat_completion(request: AIChatRequest) -> Result<AIChatResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    match request.provider.as_str() {
        "openai" => {
            let body = serde_json::json!({
                "model": request.model,
                "messages": request.messages.iter().map(|m| serde_json::json!({"role": m.role, "content": m.content})).collect::<Vec<_>>(),
                "max_tokens": request.max_tokens.unwrap_or(1024),
                "temperature": 0.7,
            });
            let resp = client.post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", request.api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await.map_err(|e| format!("OpenAI request failed: {}", e))?;
            let json: serde_json::Value = resp.json().await.map_err(|e| format!("OpenAI parse error: {}", e))?;
            let content = json["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();
            let tokens = json["usage"]["total_tokens"].as_u64().unwrap_or(0) as u32;
            Ok(AIChatResponse { content, model: request.model, provider: "openai".into(), tokens_used: tokens })
        }
        "anthropic" => {
            let system_msg = request.messages.iter().find(|m| m.role == "system").map(|m| m.content.clone());
            let msgs: Vec<_> = request.messages.iter().filter(|m| m.role != "system")
                .map(|m| serde_json::json!({"role": m.role, "content": m.content})).collect();
            let mut body = serde_json::json!({
                "model": request.model,
                "messages": msgs,
                "max_tokens": request.max_tokens.unwrap_or(1024),
            });
            if let Some(sys) = system_msg {
                body["system"] = serde_json::Value::String(sys);
            }
            let resp = client.post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &request.api_key)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await.map_err(|e| format!("Anthropic request failed: {}", e))?;
            let json: serde_json::Value = resp.json().await.map_err(|e| format!("Anthropic parse error: {}", e))?;
            let content = json["content"][0]["text"].as_str().unwrap_or("").to_string();
            let tokens = json["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32
                + json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;
            Ok(AIChatResponse { content, model: request.model, provider: "anthropic".into(), tokens_used: tokens })
        }
        "google" => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                request.model, request.api_key
            );
            let parts: Vec<_> = request.messages.iter()
                .map(|m| serde_json::json!({"role": if m.role == "assistant" { "model" } else { "user" }, "parts": [{"text": m.content}]}))
                .collect();
            let body = serde_json::json!({ "contents": parts });
            let resp = client.post(&url)
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await.map_err(|e| format!("Google AI request failed: {}", e))?;
            let json: serde_json::Value = resp.json().await.map_err(|e| format!("Google AI parse error: {}", e))?;
            let content = json["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("").to_string();
            let tokens = json["usageMetadata"]["totalTokenCount"].as_u64().unwrap_or(0) as u32;
            Ok(AIChatResponse { content, model: request.model, provider: "google".into(), tokens_used: tokens })
        }
        "ollama" => {
            let endpoint = request.endpoint.unwrap_or_else(|| "http://localhost:11434".into());
            let msgs: Vec<_> = request.messages.iter()
                .map(|m| serde_json::json!({"role": m.role, "content": m.content})).collect();
            let body = serde_json::json!({
                "model": request.model,
                "messages": msgs,
                "stream": false,
            });
            let resp = client.post(format!("{}/api/chat", endpoint))
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await.map_err(|e| format!("Ollama request failed: {}", e))?;
            let json: serde_json::Value = resp.json().await.map_err(|e| format!("Ollama parse error: {}", e))?;
            let content = json["message"]["content"].as_str().unwrap_or("").to_string();
            let tokens = json["eval_count"].as_u64().unwrap_or(0) as u32;
            Ok(AIChatResponse { content, model: request.model, provider: "ollama".into(), tokens_used: tokens })
        }
        _ => Err(format!("Unknown AI provider: {}", request.provider)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let message = format!("SloerSpace encountered a fatal error:\n\n{}", info);
        eprintln!("{}", message);
        if let Some(crash_dir) = std::env::temp_dir().parent().map(|p| p.to_path_buf()).or_else(|| Some(std::env::temp_dir())) {
            let crash_log = crash_dir.join("sloerspace-crash.log");
            let _ = std::fs::write(&crash_log, &message);
        }
    }));

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_default_workdir,
            get_terminal_capabilities,
            inspect_working_directory,
            ensure_terminal_session,
            start_pty_stream,
            get_terminal_session_snapshot,
            get_terminal_session_events,
            list_terminal_sessions,
            run_terminal_session_command,
            close_terminal_session,
            write_terminal_session_input,
            resize_terminal_session,
            run_terminal_command,
            cancel_running_command,
            get_git_branch,
            list_directory_contents,
            get_system_info,
            get_agent_cli_resolutions,
            get_app_version,
            check_app_update,
            install_app_update,
            handle_dropped_files,
            browser_create_pane,
            browser_close_pane,
            browser_navigate_pane,
            browser_resize_pane,
            browser_list_panes,
            browser_toggle_devtools,
            browser_set_visible,
            ai_chat_completion,
            read_file_content,
            write_file_content,
            get_directory_tree,
            get_git_status,
            get_git_log,
            get_git_diff,
            git_stage_file,
            git_unstage_file,
            git_commit,
            test_ssh_connection,
            get_ssh_bootstrap_command,
            read_env_file,
            write_env_file,
            index_codebase,
            get_system_stats,
            scan_active_ports,
            kill_process_by_pid,
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .build(tauri::generate_context!());

    match app {
        Ok(application) => {
            application.run(|_app_handle, _event| {});
        }
        Err(error) => {
            eprintln!("Failed to start SloerSpace: {}", error);
            std::process::exit(1);
        }
    }
}
