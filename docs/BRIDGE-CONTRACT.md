# TypeScript ↔ Rust Bridge Contract

> Defines the interface contract between the Next.js frontend (`src/lib/desktop.ts`) and the Tauri Rust backend (`src-tauri/src/lib.rs`). Both sides MUST stay in sync.

---

## Tauri Command Registry

| Rust Command | TS Bridge Function | Return Type | Auth | Notes |
|---|---|---|---|---|
| `get_default_workdir` | `getDefaultWorkingDirectory()` | `string` | No | Falls back to home dir |
| `get_terminal_capabilities` | `getTerminalCapabilities()` | `TerminalCapabilities` | No | Static runtime descriptor |
| `inspect_working_directory` | `inspectWorkingDirectory(cwd)` | `WorkingDirectoryInsight` | No | Project type detection |
| `ensure_terminal_session` | `ensureTerminalSession(...)` | `TerminalSessionSnapshot` | No | Creates or updates session |
| `start_pty_stream` | `startPtyStream(sessionId)` | `boolean` | No | Starts background PTY reader |
| `get_terminal_session_snapshot` | `getTerminalSessionSnapshot(id)` | `TerminalSessionSnapshot?` | No | |
| `get_terminal_session_events` | `getTerminalSessionEvents(id, limit?)` | `TerminalSessionEvent[]` | No | Max 80 events |
| `list_terminal_sessions` | `listTerminalSessions()` | `TerminalSessionSnapshot[]` | No | Sorted by updated_at desc |
| `run_terminal_session_command` | `runTerminalSessionCommand(...)` | `TerminalSessionCommandResult` | No | Full session lifecycle |
| `close_terminal_session` | `closeTerminalSession(id)` | `boolean` | No | Kills PTY + cleans up |
| `write_terminal_session_input` | `writeTerminalSessionInput(id, input)` | `boolean` | No | PTY stdin write |
| `resize_terminal_session` | `resizeTerminalSession(id, cols, rows)` | `boolean` | No | PTY resize |
| `run_terminal_command` | `runTerminalCommand(cmd, cwd, id?, timeout?)` | `TerminalCommandResult` | No | Stateless execution |
| `cancel_running_command` | `cancelRunningCommand(id)` | `boolean` | No | Kills process by command ID |
| `get_git_branch` | `getGitBranch(cwd)` | `string?` | No | |
| `list_directory_contents` | `listDirectoryContents(cwd, prefix?)` | `DirectoryEntry[]` | No | Path traversal guarded |
| `get_system_info` | `getSystemInfo()` | `SystemInfo` | No | |
| `get_agent_cli_resolutions` | `getAgentCliResolutions(clis?)` | `AgentCliResolution[]` | No | CLI availability probe |
| `get_app_version` | `getAppVersion()` | `string` | No | From CARGO_PKG_VERSION |
| `check_app_update` | `checkAppUpdate()` | `AppUpdateInfo` | No | GitHub Releases API |
| `install_app_update` | `installAppUpdate()` | `string` | No | Domain-validated download |

---

## Shared Types

### `TerminalCommandResult`
```
Rust: struct TerminalCommandResult      (serde camelCase)
TS:   interface TerminalCommandResult   (src/lib/desktop.ts)

Fields:
  stdout:       String / string
  stderr:       String / string
  exitCode:     i32    / number
  durationMs:   u128   / number
  resolvedCwd:  String / string
  timedOut:     bool   / boolean
  cancelled:    bool   / boolean
```

### `TerminalSessionSnapshot`
```
Rust: struct TerminalSessionSnapshot    (serde camelCase)
TS:   interface TerminalSessionSnapshot (src/lib/desktop.ts)

Fields:
  sessionId:       String         / string
  label:           Option<String> / string | null
  sessionKind:     String         / string
  backendKind:     String         / string
  cwd:             String         / string
  createdAtMs:     u64            / number
  updatedAtMs:     u64            / number
  lastCommand:     Option<String> / string | null
  lastExitCode:    Option<i32>    / number | null
  lastDurationMs:  Option<u64>    / number | null
  executionCount:  u32            / number
  isRunning:       bool           / boolean
  activeCommandId: Option<String> / string | null
  executionMode:   String         / string
  shell:           String         / string
```

### `TerminalCapabilities`
```
Fields:
  desktopRuntimeAvailable: bool / boolean
  commandBlocks:           bool / boolean
  workflows:               bool / boolean
  safeCancellation:        bool / boolean
  persistentSessions:      bool / boolean
  streamingOutput:         bool / boolean
  interactiveInput:        bool / boolean
  sessionResize:           bool / boolean
  altScreen:               bool / boolean
  remoteDomains:           bool / boolean
  widgets:                 bool / boolean
  executionMode:           String / string
  backendKind:             String / string
  shell:                   String / string
```

### `AgentCliResolution`
```
Fields:
  cli:              String         / string
  available:        bool           / boolean
  resolvedPath:     Option<String> / string | null
  bootstrapCommand: Option<String> / string | null
```

### `AppUpdateInfo`
```
Fields:
  currentVersion:     String         / string
  latestVersion:      String         / string
  hasUpdate:          bool           / boolean
  installerAvailable: bool           / boolean
  assetName:          Option<String> / string | null
  assetDownloadUrl:   Option<String> / string | null
  releasePageUrl:     String         / string
  publishedAt:        Option<String> / string | null
  notes:              Option<String> / string | null
```

### `DirectoryEntry`
```
Fields:
  name:  String / string
  isDir: bool   / boolean
  size:  u64    / number
```

### `SystemInfo`
```
Fields:
  os:          String / string
  arch:        String / string
  hostname:    String / string
  username:    String / string
  homeDir:     String / string
  shell:       String / string
  nodeVersion: String / string
  rustVersion: String / string
```

### `WorkingDirectoryInsight`
```
Fields:
  cwd:                 String                  / string
  projectType:         String                  / string
  packageManager:      Option<String>          / string | null
  isGitRepo:           bool                    / boolean
  hasReadme:           bool                    / boolean
  hasEnvFile:          bool                    / boolean
  hasDocker:           bool                    / boolean
  recommendedCommands: Vec<RecommendedCommand> / RecommendedCommand[]
```

---

## Event Channels (Tauri → Frontend)

| Event Name | Payload Type | Description |
|---|---|---|
| `terminal-session-live` | `TerminalSessionLiveEvent` | Session snapshot + optional lifecycle event |
| `terminal-session-stream` | `TerminalSessionStreamEvent` | PTY output chunk with sequence number |

### `TerminalSessionLiveEvent`
```
Fields:
  sessionSnapshot: TerminalSessionSnapshot
  event:           TerminalSessionEvent | null
```

### `TerminalSessionStreamEvent`
```
Fields:
  sessionId: String / string
  commandId: Option<String> / string | null
  chunk:     String / string
  sequence:  u64 / number
```

---

## Serialization Rules

1. **Rust → TS**: All Rust structs use `#[serde(rename_all = "camelCase")]` for automatic field name conversion
2. **TS → Rust**: Tauri invoke args use camelCase keys that map to snake_case Rust function parameters
3. **Option<T>**: Serializes to `null` in JSON, maps to `T | null` in TypeScript
4. **Error handling**: All Tauri commands return `Result<T, String>` — errors become rejected promises in TS
5. **u128 (durationMs)**: Serialized as JSON number; safe up to `Number.MAX_SAFE_INTEGER` (~9 quadrillion ms)

## Bridge Pattern

All Tauri invocations in `desktop.ts` follow this pattern:
```typescript
export async function someCommand(args) {
  if (!isTauriApp()) {
    return fallbackValue  // Browser fallback
  }
  return tauriInvoke<ReturnType>('command_name', { arg1, arg2 })
}
```

The `isTauriApp()` guard checks `window.__TAURI_INTERNALS__` to determine if running inside Tauri or a browser.

---

## Security Invariants

1. **Command input**: Max 4000 chars, blocked destructive prefixes (`format`, `diskpart`, `rm -rf /`)
2. **Path operations**: All paths resolved via `resolve_working_directory()` which validates existence and canonicalizes
3. **Directory listing**: Path traversal guard prevents listing outside the resolved cwd
4. **Update downloads**: URL domain validated against `github.com` and `objects.githubusercontent.com`
5. **PTY input**: Direct byte write, no shell interpretation layer
