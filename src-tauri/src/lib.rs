use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{LazyLock, Mutex},
};

use serde::Serialize;
use tokio::time::{timeout, Duration};

const MAX_OUTPUT_BYTES: usize = 1_048_576;
const DEFAULT_TIMEOUT_SECS: u64 = 120;

static RUNNING_PROCESSES: LazyLock<Mutex<HashMap<String, Option<u32>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

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

    resolved_path.canonicalize().map_err(|error| error.to_string())
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

#[tauri::command]
async fn run_terminal_command(
    command: String,
    cwd: String,
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

    let resolved_cwd = resolve_working_directory(&cwd)?;

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

    if !cmd_id.is_empty() {
        if let Ok(mut map) = RUNNING_PROCESSES.lock() {
            map.remove(&cmd_id);
        }
    }

    let duration_ms = started_at.elapsed().as_millis();

    match result {
        Ok(Ok(output)) => {
            let mut stdout_str = String::from_utf8_lossy(&output.stdout).into_owned();
            let mut stderr_str = String::from_utf8_lossy(&output.stderr).into_owned();

            if stdout_str.len() > MAX_OUTPUT_BYTES {
                stdout_str.truncate(MAX_OUTPUT_BYTES);
                stdout_str.push_str("\n\n[Output truncated at 1MB]");
            }
            if stderr_str.len() > MAX_OUTPUT_BYTES {
                stderr_str.truncate(MAX_OUTPUT_BYTES);
                stderr_str.push_str("\n\n[Error output truncated at 1MB]");
            }

            Ok(TerminalCommandResult {
                stdout: stdout_str,
                stderr: stderr_str,
                exit_code: output.status.code().unwrap_or(if output.status.success() { 0 } else { -1 }),
                duration_ms,
                resolved_cwd: clean_path_display(&resolved_cwd),
                timed_out: false,
                cancelled: false,
            })
        }
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => Ok(TerminalCommandResult {
            stdout: String::new(),
            stderr: format!("Command timed out after {}s", dur.as_secs()),
            exit_code: -1,
            duration_ms,
            resolved_cwd: clean_path_display(&resolved_cwd),
            timed_out: true,
            cancelled: false,
        }),
    }
}

#[tauri::command]
async fn cancel_running_command(command_id: String) -> Result<bool, String> {
    let pid = {
        let map = RUNNING_PROCESSES.lock().map_err(|e| e.to_string())?;
        map.get(&command_id).and_then(|p| *p)
    };

    if let Some(pid) = pid {
        #[cfg(target_os = "windows")]
        {
            let _ = spawn_silent("taskkill", &["/F", "/T", "/PID", &pid.to_string()])
                .and_then(|c| Ok(c.wait_with_output()));
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("kill").args(["-9", &pid.to_string()]).output();
        }

        if let Ok(mut map) = RUNNING_PROCESSES.lock() {
            map.remove(&command_id);
        }
        Ok(true)
    } else {
        Ok(false)
    }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_default_workdir,
            run_terminal_command,
            cancel_running_command,
            get_git_branch,
            list_directory_contents,
            get_system_info,
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
